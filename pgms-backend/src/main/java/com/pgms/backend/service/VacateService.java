package com.pgms.backend.service;

import com.pgms.backend.dto.vacate.VacateNoticeResponse;
import com.pgms.backend.dto.vacate.VacateRequest;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.VacateNotice;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.entity.enums.VacateStatus;
import com.pgms.backend.entity.enums.VacateType;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.VacateNoticeRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class VacateService {

    private final VacateNoticeRepository vacateNoticeRepository;
    private final AccessControlService accessControlService;
    private final TenantProfileRepository tenantProfileRepository;
    private final RoomRepository roomRepository;

    public VacateService(VacateNoticeRepository vacateNoticeRepository,
                         AccessControlService accessControlService,
                         TenantProfileRepository tenantProfileRepository,
                         RoomRepository roomRepository) {
        this.vacateNoticeRepository = vacateNoticeRepository;
        this.accessControlService = accessControlService;
        this.tenantProfileRepository = tenantProfileRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional
    public VacateNoticeResponse createVacateRequest(VacateRequest request) {
        TenantProfile tenantProfile = accessControlService.getCurrentTenantProfile();
        ensureNoActiveNotice(tenantProfile);
        if (request.getIntendedVacateDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Vacate date cannot be in the past");
        }
        if (Boolean.TRUE.equals(request.getHasReferral())
                && (isBlank(request.getReferralName()) || isBlank(request.getReferralPhone()) || isBlank(request.getReferralEmail()))) {
            throw new BadRequestException("Referral name, phone and email are required");
        }
        long noticeDays = ChronoUnit.DAYS.between(LocalDate.now(), request.getIntendedVacateDate());
        boolean refundEligible = noticeDays >= 30;
        double refundAmount = refundEligible ? Math.max(tenantProfile.getAdvanceAmountPaid() - 1000, 0) : 0;
        VacateNotice notice = VacateNotice.builder()
                .tenantProfile(tenantProfile)
                .intendedVacateDate(request.getIntendedVacateDate())
                .noticeType(Boolean.TRUE.equals(request.getHasReferral()) ? VacateType.REFERRAL : VacateType.STANDARD)
                .status(Boolean.TRUE.equals(request.getHasReferral()) ? VacateStatus.REFERRAL_PENDING : VacateStatus.PENDING)
                .refundEligible(refundEligible)
                .advanceRefundAmount(refundAmount)
                .referralName(request.getReferralName())
                .referralPhone(request.getReferralPhone())
                .referralEmail(request.getReferralEmail())
                .managerMessage(null)
                .createdAt(LocalDateTime.now())
                .build();
        tenantProfile.setStatus(TenantStatus.VACATING);
        tenantProfile.getRoom().setStatus(RoomStatus.VACATING);
        tenantProfileRepository.save(tenantProfile);
        roomRepository.save(tenantProfile.getRoom());
        return toResponse(vacateNoticeRepository.save(notice));
    }

    public VacateNoticeResponse getCurrentTenantVacateNotice() {
        VacateNotice notice = vacateNoticeRepository.findFirstByTenantProfileUserIdAndStatusNotOrderByCreatedAtDesc(
                        accessControlService.getCurrentTenantProfile().getUser().getId(), VacateStatus.COMPLETED)
                .orElseThrow(() -> new NotFoundException("Vacate notice not found"));
        return toResponse(notice);
    }

    public List<VacateNoticeResponse> getManagerVacateNotices() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return vacateNoticeRepository.findByTenantProfilePgId(pgId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public VacateNoticeResponse approveReferral(Long id, boolean approve) {
        VacateNotice notice = getVacateNoticeForManager(id);
        if (notice.getNoticeType() != VacateType.REFERRAL) {
            throw new BadRequestException("Only referral notices can be approved here");
        }
        if (approve) {
            notice.setStatus(VacateStatus.APPROVED);
            notice.setRefundEligible(true);
            notice.setAdvanceRefundAmount(Math.max(notice.getTenantProfile().getAdvanceAmountPaid() - 1000, 0));
        } else {
            revertVacateState(notice);
            notice.setStatus(VacateStatus.REJECTED);
        }
        return toResponse(vacateNoticeRepository.save(notice));
    }

    @Transactional
    public VacateNoticeResponse reject(Long id, String message) {
        VacateNotice notice = getVacateNoticeForManager(id);
        if (notice.getStatus() == VacateStatus.COMPLETED || notice.getStatus() == VacateStatus.REJECTED) {
            throw new BadRequestException("This vacate notice is already closed");
        }
        revertVacateState(notice);
        notice.setStatus(VacateStatus.REJECTED);
        notice.setManagerMessage(message.trim());
        return toResponse(vacateNoticeRepository.save(notice));
    }

    @Transactional
    public VacateNoticeResponse checkout(Long id) {
        VacateNotice notice = getVacateNoticeForManager(id);
        notice.setStatus(VacateStatus.COMPLETED);
        TenantProfile profile = notice.getTenantProfile();
        profile.setStatus(TenantStatus.ARCHIVED);
        Room room = profile.getRoom();
        room.setStatus(RoomStatus.VACANT);
        tenantProfileRepository.save(profile);
        roomRepository.save(room);
        return toResponse(vacateNoticeRepository.save(notice));
    }

    public VacateNoticeResponse toResponse(VacateNotice notice) {
        return VacateNoticeResponse.builder()
                .id(notice.getId())
                .tenantProfileId(notice.getTenantProfile().getId())
                .tenantName(notice.getTenantProfile().getUser().getName())
                .roomNumber(notice.getTenantProfile().getRoom().getRoomNumber())
                .intendedVacateDate(notice.getIntendedVacateDate())
                .noticeType(notice.getNoticeType())
                .status(notice.getStatus())
                .refundEligible(notice.getRefundEligible())
                .advanceRefundAmount(notice.getAdvanceRefundAmount())
                .referralName(notice.getReferralName())
                .referralPhone(notice.getReferralPhone())
                .referralEmail(notice.getReferralEmail())
                .managerMessage(notice.getManagerMessage())
                .build();
    }

    private void ensureNoActiveNotice(TenantProfile tenantProfile) {
        boolean hasActiveNotice = vacateNoticeRepository
                .findFirstByTenantProfileIdAndStatusInOrderByCreatedAtDesc(
                        tenantProfile.getId(),
                        List.of(VacateStatus.PENDING, VacateStatus.REFERRAL_PENDING, VacateStatus.APPROVED)
                )
                .isPresent();
        if (hasActiveNotice) {
            throw new BadRequestException("You already have a vacate request in progress");
        }
    }

    private void revertVacateState(VacateNotice notice) {
        TenantProfile profile = notice.getTenantProfile();
        profile.setStatus(TenantStatus.ACTIVE);
        Room room = profile.getRoom();
        room.setStatus(RoomStatus.OCCUPIED);
        tenantProfileRepository.save(profile);
        roomRepository.save(room);
    }

    private VacateNotice getVacateNoticeForManager(Long id) {
        VacateNotice notice = vacateNoticeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vacate notice not found"));
        accessControlService.ensureManagerAssignedToPg(notice.getTenantProfile().getPg().getId());
        return notice;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
