package com.pgms.backend.service;

import com.pgms.backend.dto.payment.WalletResponse;
import com.pgms.backend.dto.sublet.SubletCompleteRequest;
import com.pgms.backend.dto.sublet.SubletCreateRequest;
import com.pgms.backend.dto.sublet.SubletResponse;
import com.pgms.backend.entity.SubletRequest;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SubletStatus;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.SubletRequestRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class SubletService {

    private final SubletRequestRepository subletRequestRepository;
    private final AccessControlService accessControlService;
    private final TenantProfileRepository tenantProfileRepository;

    public SubletService(SubletRequestRepository subletRequestRepository,
                         AccessControlService accessControlService,
                         TenantProfileRepository tenantProfileRepository) {
        this.subletRequestRepository = subletRequestRepository;
        this.accessControlService = accessControlService;
        this.tenantProfileRepository = tenantProfileRepository;
    }

    @Transactional
    public SubletResponse createRequest(SubletCreateRequest request) {
        SubletRequest sublet = subletRequestRepository.save(SubletRequest.builder()
                .tenantProfile(accessControlService.getCurrentTenantProfile())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .status(SubletStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(sublet);
    }

    public List<SubletResponse> getTenantSublets() {
        return subletRequestRepository.findByTenantProfileUserIdOrderByCreatedAtDesc(accessControlService.getCurrentTenantProfile().getUser().getId())
                .stream().map(this::toResponse).toList();
    }

    public WalletResponse getWallet() {
        return new WalletResponse(accessControlService.getCurrentTenantProfile().getCreditWalletBalance());
    }

    public List<SubletResponse> getManagerSublets() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return subletRequestRepository.findByTenantProfilePgIdOrderByCreatedAtDesc(pgId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SubletResponse approve(Long id) {
        SubletRequest request = getForManager(id);
        request.setStatus(SubletStatus.APPROVED);
        request.getTenantProfile().getRoom().setStatus(RoomStatus.SUBLETTING);
        tenantProfileRepository.save(request.getTenantProfile());
        return toResponse(subletRequestRepository.save(request));
    }

    @Transactional
    public SubletResponse complete(Long id, SubletCompleteRequest request) {
        SubletRequest sublet = getForManager(id);
        sublet.setStatus(SubletStatus.COMPLETED);
        sublet.setGuestName(request.getGuestName());
        sublet.setGuestPhone(request.getGuestPhone());
        sublet.setCheckInDate(request.getCheckInDate());
        sublet.setCheckOutDate(LocalDate.now());
        TenantProfile profile = sublet.getTenantProfile();
        long occupiedDays = Math.max(ChronoUnit.DAYS.between(request.getCheckInDate(), LocalDate.now()), 1);
        double credit = (occupiedDays / (double) YearMonth.now().lengthOfMonth()) * profile.getRoom().getMonthlyRent();
        profile.setCreditWalletBalance(profile.getCreditWalletBalance() + credit);
        profile.getRoom().setStatus(RoomStatus.OCCUPIED);
        tenantProfileRepository.save(profile);
        return toResponse(subletRequestRepository.save(sublet));
    }

    public SubletResponse toResponse(SubletRequest sublet) {
        return SubletResponse.builder()
                .id(sublet.getId())
                .tenantProfileId(sublet.getTenantProfile().getId())
                .tenantName(sublet.getTenantProfile().getUser().getName())
                .roomNumber(sublet.getTenantProfile().getRoom().getRoomNumber())
                .startDate(sublet.getStartDate())
                .endDate(sublet.getEndDate())
                .reason(sublet.getReason())
                .status(sublet.getStatus())
                .guestName(sublet.getGuestName())
                .guestPhone(sublet.getGuestPhone())
                .checkInDate(sublet.getCheckInDate())
                .checkOutDate(sublet.getCheckOutDate())
                .build();
    }

    private SubletRequest getForManager(Long id) {
        SubletRequest sublet = subletRequestRepository.findById(id).orElseThrow(() -> new NotFoundException("Sublet request not found"));
        accessControlService.ensureManagerAssignedToPg(sublet.getTenantProfile().getPg().getId());
        return sublet;
    }
}
