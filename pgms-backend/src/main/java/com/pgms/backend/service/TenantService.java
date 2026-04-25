package com.pgms.backend.service;

import com.pgms.backend.dto.tenant.TenantCreateRequest;
import com.pgms.backend.dto.tenant.TenantProfileUpdateRequest;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.TenantStatus;
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

import java.util.List;

@Service
public class TenantService {

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

    @Transactional
    public TenantResponse updateCurrentTenantProfile(TenantProfileUpdateRequest request) {
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        profile.setKycDocType(request.getKycDocType());
        profile.setKycDocPath(request.getKycDocPath());
        return toResponse(tenantProfileRepository.save(profile));
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
                .creditWalletBalance(profile.getCreditWalletBalance())
                .status(profile.getStatus())
                .isActive(profile.getUser().isActive())
                .build();
    }

    private void ensureCanManagePg(Long pgId) {
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (currentRole == Role.MANAGER) {
            accessControlService.ensureManagerAssignedToPg(pgId);
            return;
        }
        if (currentRole != Role.OWNER) {
            throw new ForbiddenException("You are not allowed to manage tenants");
        }
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
}
