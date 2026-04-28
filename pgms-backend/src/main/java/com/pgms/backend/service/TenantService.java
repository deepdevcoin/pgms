package com.pgms.backend.service;

import com.pgms.backend.dto.tenant.TenantCreateRequest;
import com.pgms.backend.dto.tenant.TenantProfileUpdateRequest;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.KycStatus;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.ConflictException;
import com.pgms.backend.exception.ForbiddenException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.UserRepository;
import com.pgms.backend.util.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.time.LocalDateTime;

@Service
public class TenantService {
    private static final Path KYC_UPLOAD_ROOT = Paths.get(System.getProperty("user.dir"), "uploads", "kyc");

    private final TenantProfileRepository tenantProfileRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccessControlService accessControlService;
    private final PaymentService paymentService;

    public TenantService(TenantProfileRepository tenantProfileRepository,
                         UserRepository userRepository,
                         RoomRepository roomRepository,
                         PasswordEncoder passwordEncoder,
                         AccessControlService accessControlService,
                         PaymentService paymentService) {
        this.tenantProfileRepository = tenantProfileRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.passwordEncoder = passwordEncoder;
        this.accessControlService = accessControlService;
        this.paymentService = paymentService;
    }

    @Transactional
    public TenantResponse createTenant(TenantCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already exists");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new ConflictException("Phone already exists");
        }
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new NotFoundException("Room not found"));
        ensureCanManagePg(room.getPg().getId());
        if (room.getStatus() == RoomStatus.MAINTENANCE || room.getStatus() == RoomStatus.VACATING || room.getStatus() == RoomStatus.SUBLETTING) {
            throw new ConflictException("This room is not available for new tenant assignment");
        }
        int currentOccupancy = tenantProfileRepository.findByRoomIdAndStatusIn(
                room.getId(),
                List.of(TenantStatus.ACTIVE, TenantStatus.VACATING)
        ).size();
        if (currentOccupancy >= getCapacity(room)) {
            throw new ConflictException("This room is already at full capacity");
        }
        User user = userRepository.save(User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(AuthService.DEFAULT_USER_PASSWORD))
                .role(Role.TENANT)
                .isActive(true)
                .isFirstLogin(true)
                .build());
        TenantProfile profile = tenantProfileRepository.save(TenantProfile.builder()
                .user(user)
                .pg(room.getPg())
                .room(room)
                .joiningDate(request.getJoiningDate())
                .advanceAmountPaid(request.getAdvanceAmountPaid())
                .kycStatus(KycStatus.NOT_SUBMITTED)
                .status(TenantStatus.ACTIVE)
                .creditWalletBalance(0.0)
                .build());
        refreshRoomOccupancyStatus(room);
        paymentService.ensureCurrentMonthRentRecord(profile);
        return toResponse(profile);
    }

    private int getCapacity(Room room) {
        return switch (room.getSharingType()) {
            case SINGLE -> 1;
            case DOUBLE -> 2;
            case TRIPLE -> 3;
            case DORM -> 6;
        };
    }

    public List<TenantResponse> getTenantsForCurrentManager() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        return tenantProfileRepository.findByPgIdIn(pgIds).stream()
                .filter(profile -> profile.getStatus() != TenantStatus.ARCHIVED)
                .map(this::toResponse)
                .toList();
    }

    public List<TenantResponse> getAllTenants() {
        return tenantProfileRepository.findAll().stream()
                .filter(profile -> profile.getStatus() != TenantStatus.ARCHIVED)
                .map(this::toResponse)
                .toList();
    }

    public TenantResponse getCurrentTenantProfile() {
        return toResponse(accessControlService.getCurrentTenantProfile());
    }

    public List<TenantResponse> getKycForCurrentManager() {
        return getTenantsForCurrentManager().stream()
                .filter(tenant -> tenant.getTenantProfileId() != null)
                .toList();
    }

    @Transactional
    public TenantResponse updateCurrentTenantProfile(TenantProfileUpdateRequest request) {
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        profile.setKycDocType(request.getKycDocType());
        profile.setKycDocPath(request.getKycDocPath());
        return toResponse(tenantProfileRepository.save(profile));
    }

    @Transactional
    public TenantResponse uploadCurrentTenantKyc(String docType, MultipartFile file) {
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        if (profile.getKycStatus() == KycStatus.VERIFIED) {
            throw new BadRequestException("This KYC document is already verified. Ask your manager to request a replacement first.");
        }
        if (docType == null || docType.trim().isEmpty()) {
            throw new BadRequestException("Document type is required");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Document file is required");
        }
        String originalFileName = file.getOriginalFilename();
        String safeFileName = sanitizeFileName(originalFileName == null || originalFileName.isBlank() ? "kyc-document" : originalFileName);
        String extension = extensionOf(safeFileName);
        if (!isAllowedKycExtension(extension)) {
            throw new BadRequestException("Upload a PDF, JPG, JPEG, or PNG document");
        }

        Path tenantDir = KYC_UPLOAD_ROOT.resolve("tenant-" + profile.getId());
        String storedName = System.currentTimeMillis() + "-" + safeFileName;
        Path target = tenantDir.resolve(storedName);
        try {
            Files.createDirectories(tenantDir);
            deleteIfPresent(resolveStoredPath(profile.getKycDocPath()));
            file.transferTo(target);
        } catch (IOException ex) {
            throw new BadRequestException("Could not store KYC document");
        }

        profile.setKycDocType(docType.trim());
        profile.setKycDocPath("tenant-" + profile.getId() + "/" + storedName);
        profile.setKycStatus(KycStatus.SUBMITTED);
        profile.setKycSubmittedAt(LocalDateTime.now());
        profile.setKycVerifiedAt(null);
        profile.setKycVerifiedByName(null);
        profile.setKycReplacementNotes(null);
        profile.setKycReplacementRequestedAt(null);
        profile.setKycReplacementRequestedByName(null);
        return toResponse(tenantProfileRepository.save(profile));
    }

    @Transactional
    public TenantResponse verifyTenantKyc(Long tenantProfileId) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        ensureCanManagePg(profile.getPg().getId());
        if (profile.getKycDocPath() == null || profile.getKycDocPath().isBlank()) {
            throw new BadRequestException("No KYC document has been uploaded for this tenant");
        }
        if (profile.getKycStatus() != KycStatus.SUBMITTED) {
            throw new BadRequestException("Only submitted KYC documents can be verified");
        }
        if (profile.getKycStatus() == KycStatus.VERIFIED) {
            return toResponse(profile);
        }
        User verifier = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new NotFoundException("Current user not found"));
        profile.setKycStatus(KycStatus.VERIFIED);
        profile.setKycVerifiedAt(LocalDateTime.now());
        profile.setKycVerifiedByName(verifier.getName());
        profile.setKycReplacementNotes(null);
        profile.setKycReplacementRequestedAt(null);
        profile.setKycReplacementRequestedByName(null);
        return toResponse(tenantProfileRepository.save(profile));
    }

    @Transactional
    public TenantResponse requestTenantKycReplacement(Long tenantProfileId, String notes) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        ensureCanManagePg(profile.getPg().getId());
        if (profile.getKycDocPath() == null || profile.getKycDocPath().isBlank()) {
            throw new BadRequestException("No KYC document is available to replace");
        }
        if (profile.getKycStatus() != KycStatus.VERIFIED && profile.getKycStatus() != KycStatus.SUBMITTED) {
            throw new BadRequestException("Replacement can only be requested for submitted or verified documents");
        }
        String normalizedNotes = notes == null ? "" : notes.trim();
        if (normalizedNotes.isEmpty()) {
            throw new BadRequestException("Replacement note is required");
        }
        User manager = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new NotFoundException("Current user not found"));
        profile.setKycStatus(KycStatus.REPLACEMENT_REQUESTED);
        profile.setKycReplacementNotes(normalizedNotes);
        profile.setKycReplacementRequestedAt(LocalDateTime.now());
        profile.setKycReplacementRequestedByName(manager.getName());
        return toResponse(tenantProfileRepository.save(profile));
    }

    public Path getCurrentTenantKycDocumentPath() {
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        return resolveExistingKycPath(profile);
    }

    public Path getManagerTenantKycDocumentPath(Long tenantProfileId) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        ensureCanManagePg(profile.getPg().getId());
        return resolveExistingKycPath(profile);
    }

    public TenantProfile getTenantProfileOrThrow(Long id) {
        return tenantProfileRepository.findById(id).orElseThrow(() -> new NotFoundException("Tenant profile not found"));
    }

    @Transactional
    public TenantResponse moveTenant(Long tenantProfileId, Long targetRoomId) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        if (profile.getStatus() == TenantStatus.ARCHIVED) {
            throw new ConflictException("Archived tenants cannot be reassigned");
        }
        ensureCanManagePg(profile.getPg().getId());
        Room targetRoom = roomRepository.findById(targetRoomId)
                .orElseThrow(() -> new NotFoundException("Target room not found"));
        ensureCanManagePg(targetRoom.getPg().getId());

        if (profile.getRoom().getId().equals(targetRoom.getId())) {
            return toResponse(profile);
        }
        validateTargetRoomAvailability(targetRoom);

        Room previousRoom = profile.getRoom();
        profile.setRoom(targetRoom);
        profile.setPg(targetRoom.getPg());
        TenantProfile saved = tenantProfileRepository.save(profile);
        refreshRoomOccupancyStatus(previousRoom);
        refreshRoomOccupancyStatus(targetRoom);
        return toResponse(saved);
    }

    @Transactional
    public TenantResponse updateTenantAccountStatus(Long tenantProfileId, boolean active) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        ensureCanManagePg(profile.getPg().getId());
        profile.getUser().setActive(active);
        userRepository.save(profile.getUser());
        return toResponse(profile);
    }

    @Transactional
    public TenantResponse archiveTenant(Long tenantProfileId) {
        TenantProfile profile = getTenantProfileOrThrow(tenantProfileId);
        ensureCanManagePg(profile.getPg().getId());
        if (profile.getStatus() == TenantStatus.ARCHIVED) {
            return toResponse(profile);
        }
        Room room = profile.getRoom();
        profile.setStatus(TenantStatus.ARCHIVED);
        profile.getUser().setActive(false);
        userRepository.save(profile.getUser());
        TenantProfile saved = tenantProfileRepository.save(profile);
        refreshRoomOccupancyStatus(room);
        return toResponse(saved);
    }

    public TenantResponse toResponse(TenantProfile profile) {
        return TenantResponse.builder()
                .tenantProfileId(profile.getId())
                .userId(profile.getUser().getId())
                .name(profile.getUser().getName())
                .email(profile.getUser().getEmail())
                .phone(profile.getUser().getPhone())
                .pgId(profile.getPg().getId())
                .pgName(profile.getPg().getName())
                .roomId(profile.getRoom().getId())
                .roomNumber(profile.getRoom().getRoomNumber())
                .joiningDate(profile.getJoiningDate())
                .advanceAmountPaid(profile.getAdvanceAmountPaid())
                .kycDocType(profile.getKycDocType())
                .kycDocPath(profile.getKycDocPath())
                .kycStatus(profile.getKycStatus())
                .kycSubmittedAt(profile.getKycSubmittedAt())
                .kycVerifiedAt(profile.getKycVerifiedAt())
                .kycVerifiedByName(profile.getKycVerifiedByName())
                .kycReplacementNotes(profile.getKycReplacementNotes())
                .kycReplacementRequestedAt(profile.getKycReplacementRequestedAt())
                .kycReplacementRequestedByName(profile.getKycReplacementRequestedByName())
                .creditWalletBalance(profile.getCreditWalletBalance())
                .status(profile.getStatus())
                .isActive(profile.getUser().isActive())
                .build();
    }

    private void ensureCanManagePg(Long pgId) {
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (currentRole != Role.MANAGER) {
            throw new ForbiddenException("Only managers can manage tenant lifecycle actions");
        }
        accessControlService.ensureManagerAssignedToPg(pgId);
    }

    private void validateTargetRoomAvailability(Room room) {
        if (room.getStatus() == RoomStatus.MAINTENANCE || room.getStatus() == RoomStatus.VACATING || room.getStatus() == RoomStatus.SUBLETTING) {
            throw new ConflictException("This room is not available for reassignment");
        }
        int currentOccupancy = tenantProfileRepository.findByRoomIdAndStatusIn(
                room.getId(),
                List.of(TenantStatus.ACTIVE, TenantStatus.VACATING)
        ).size();
        if (currentOccupancy >= getCapacity(room)) {
            throw new ConflictException("This room is already at full capacity");
        }
    }

    private void refreshRoomOccupancyStatus(Room room) {
        List<TenantProfile> activeProfiles = tenantProfileRepository.findByRoomIdAndStatusIn(
                room.getId(),
                List.of(TenantStatus.ACTIVE, TenantStatus.VACATING)
        );
        if (activeProfiles.isEmpty()) {
            if (room.getStatus() != RoomStatus.MAINTENANCE) {
                room.setStatus(RoomStatus.VACANT);
            }
            roomRepository.save(room);
            return;
        }

        boolean anyVacating = activeProfiles.stream().anyMatch(profile -> profile.getStatus() == TenantStatus.VACATING);
        room.setStatus(anyVacating ? RoomStatus.VACATING : RoomStatus.OCCUPIED);
        roomRepository.save(room);
    }

    private Path resolveExistingKycPath(TenantProfile profile) {
        if (profile.getKycDocPath() == null || profile.getKycDocPath().isBlank()) {
            throw new NotFoundException("KYC document not found");
        }
        Path path = resolveStoredPath(profile.getKycDocPath());
        if (path == null || !Files.exists(path)) {
            throw new NotFoundException("KYC document file not found");
        }
        return path;
    }

    private Path resolveStoredPath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        return KYC_UPLOAD_ROOT.resolve(relativePath).normalize();
    }

    private void deleteIfPresent(Path path) throws IOException {
        if (path != null && Files.exists(path)) {
            Files.delete(path);
        }
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String extensionOf(String fileName) {
        int index = fileName.lastIndexOf('.');
        return index >= 0 ? fileName.substring(index + 1).toLowerCase() : "";
    }

    private boolean isAllowedKycExtension(String extension) {
        return List.of("pdf", "png", "jpg", "jpeg").contains(extension);
    }
}
