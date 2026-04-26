package com.pgms.backend.service;

import com.pgms.backend.dto.payment.WalletResponse;
import com.pgms.backend.dto.sublet.SubletCompleteRequest;
import com.pgms.backend.dto.sublet.SubletCheckoutResponse;
import com.pgms.backend.dto.sublet.SubletCreateRequest;
import com.pgms.backend.dto.sublet.SubletResponse;
import com.pgms.backend.entity.SubletGuest;
import com.pgms.backend.entity.SubletRequest;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SubletGuestStatus;
import com.pgms.backend.entity.enums.SubletStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.SubletGuestRepository;
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
    private final SubletGuestRepository subletGuestRepository;
    private final AccessControlService accessControlService;
    private final TenantProfileRepository tenantProfileRepository;

    public SubletService(SubletRequestRepository subletRequestRepository,
                         SubletGuestRepository subletGuestRepository,
                         AccessControlService accessControlService,
                         TenantProfileRepository tenantProfileRepository) {
        this.subletRequestRepository = subletRequestRepository;
        this.subletGuestRepository = subletGuestRepository;
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
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        return subletRequestRepository.findByTenantProfilePgIdInOrderByCreatedAtDesc(pgIds).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SubletResponse approve(Long id) {
        SubletRequest request = getForManager(id);
        if (request.getStatus() != SubletStatus.PENDING) {
            throw new BadRequestException("Only pending sublets can be approved");
        }
        request.setStatus(SubletStatus.APPROVED);
        request.getTenantProfile().getRoom().setStatus(RoomStatus.SUBLETTING);
        tenantProfileRepository.save(request.getTenantProfile());
        return toResponse(subletRequestRepository.save(request));
    }

    @Transactional
    public SubletResponse checkIn(Long id, SubletCompleteRequest request) {
        SubletRequest sublet = getForManager(id);
        if (sublet.getStatus() == SubletStatus.ACTIVE) {
            throw new BadRequestException("This sublet guest is already checked in");
        }
        if (sublet.getStatus() != SubletStatus.APPROVED) {
            throw new BadRequestException("Only approved sublets can be checked in");
        }
        if (request.getCheckInDate().isBefore(sublet.getStartDate()) || request.getCheckInDate().isAfter(sublet.getEndDate())) {
            throw new BadRequestException("Check in date must be within the approved sublet window");
        }
        if (subletGuestRepository.findBySubletRequestId(sublet.getId()).isPresent()) {
            throw new BadRequestException("A guest record already exists for this sublet");
        }

        TenantProfile profile = sublet.getTenantProfile();
        SubletGuest guest = subletGuestRepository.save(SubletGuest.builder()
                .subletRequest(sublet)
                .hostTenantProfile(profile)
                .pg(profile.getPg())
                .room(profile.getRoom())
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .checkInDate(request.getCheckInDate())
                .expectedCheckOutDate(sublet.getEndDate())
                .status(SubletGuestStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());

        sublet.setGuestRecord(guest);
        sublet.setStatus(SubletStatus.ACTIVE);
        sublet.setGuestName(request.getGuestName());
        sublet.setGuestPhone(request.getGuestPhone());
        sublet.setCheckInDate(request.getCheckInDate());
        sublet.setCheckOutDate(null);
        return toResponse(subletRequestRepository.save(sublet));
    }

    @Transactional
    public SubletCheckoutResponse checkout(Long id) {
        SubletRequest sublet = getForManager(id);
        if (sublet.getStatus() != SubletStatus.ACTIVE) {
            throw new BadRequestException("Only active sublet guests can be checked out");
        }
        SubletGuest guest = subletGuestRepository.findBySubletRequestId(sublet.getId())
                .orElseThrow(() -> new NotFoundException("Sublet guest record not found"));

        LocalDate checkoutDate = LocalDate.now();
        guest.setActualCheckOutDate(checkoutDate);
        guest.setStatus(SubletGuestStatus.CHECKED_OUT);
        subletGuestRepository.save(guest);

        sublet.setStatus(SubletStatus.COMPLETED);
        sublet.setCheckOutDate(checkoutDate);

        TenantProfile profile = sublet.getTenantProfile();
        long occupiedDays = Math.max(ChronoUnit.DAYS.between(guest.getCheckInDate(), checkoutDate), 1);
        double credit = (occupiedDays / (double) YearMonth.from(guest.getCheckInDate()).lengthOfMonth()) * profile.getRoom().getMonthlyRent();
        double walletBefore = profile.getCreditWalletBalance() != null ? profile.getCreditWalletBalance() : 0.0;
        profile.setCreditWalletBalance(walletBefore + credit);
        profile.getRoom().setStatus(RoomStatus.OCCUPIED);
        tenantProfileRepository.save(profile);

        SubletResponse response = toResponse(subletRequestRepository.save(sublet));
        return new SubletCheckoutResponse(response, credit);
    }

    public SubletResponse toResponse(SubletRequest sublet) {
        SubletGuest guest = sublet.getGuestRecord();
        return SubletResponse.builder()
                .id(sublet.getId())
                .tenantProfileId(sublet.getTenantProfile().getId())
                .tenantName(sublet.getTenantProfile().getUser().getName())
                .pgId(sublet.getTenantProfile().getPg().getId())
                .pgName(sublet.getTenantProfile().getPg().getName())
                .roomNumber(sublet.getTenantProfile().getRoom().getRoomNumber())
                .startDate(sublet.getStartDate())
                .endDate(sublet.getEndDate())
                .reason(sublet.getReason())
                .status(sublet.getStatus())
                .guestName(sublet.getGuestName())
                .guestPhone(sublet.getGuestPhone())
                .checkInDate(sublet.getCheckInDate())
                .checkOutDate(sublet.getCheckOutDate())
                .subletGuestId(guest != null ? guest.getId() : null)
                .guestRecordStatus(guest != null ? guest.getStatus() : null)
                .build();
    }

    private SubletRequest getForManager(Long id) {
        SubletRequest sublet = subletRequestRepository.findById(id).orElseThrow(() -> new NotFoundException("Sublet request not found"));
        accessControlService.ensureManagerAssignedToPg(sublet.getTenantProfile().getPg().getId());
        return sublet;
    }
}
