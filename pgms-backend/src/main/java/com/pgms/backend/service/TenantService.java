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
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.UserRepository;
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
        accessControlService.ensureManagerAssignedToPg(room.getPg().getId());
        if (room.getStatus() != RoomStatus.VACANT) {
            throw new ConflictException("Only vacant rooms can be assigned");
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
        room.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room);
        TenantProfile profile = tenantProfileRepository.save(TenantProfile.builder()
                .user(user)
                .pg(room.getPg())
                .room(room)
                .joiningDate(request.getJoiningDate())
                .advanceAmountPaid(request.getAdvanceAmountPaid())
                .status(TenantStatus.ACTIVE)
                .creditWalletBalance(0.0)
                .build());
        paymentService.ensureCurrentMonthRentRecord(profile);
        return toResponse(profile);
    }

    public List<TenantResponse> getTenantsForCurrentManager() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return tenantProfileRepository.findByPgId(pgId).stream().map(this::toResponse).toList();
    }

    public List<TenantResponse> getAllTenants() {
        return tenantProfileRepository.findAll().stream().map(this::toResponse).toList();
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

    public TenantResponse toResponse(TenantProfile profile) {
        return TenantResponse.builder()
                .tenantProfileId(profile.getId())
                .userId(profile.getUser().getId())
                .name(profile.getUser().getName())
                .email(profile.getUser().getEmail())
                .phone(profile.getUser().getPhone())
                .pgId(profile.getPg().getId())
                .roomId(profile.getRoom().getId())
                .roomNumber(profile.getRoom().getRoomNumber())
                .joiningDate(profile.getJoiningDate())
                .advanceAmountPaid(profile.getAdvanceAmountPaid())
                .kycDocType(profile.getKycDocType())
                .kycDocPath(profile.getKycDocPath())
                .creditWalletBalance(profile.getCreditWalletBalance())
                .status(profile.getStatus())
                .build();
    }
}
