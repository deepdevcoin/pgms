package com.pgms.backend.service;

import com.pgms.backend.dto.analytics.AdvanceRefundItemResponse;
import com.pgms.backend.dto.analytics.ManagerSummaryResponse;
import com.pgms.backend.dto.analytics.ManagerVacateItemResponse;
import com.pgms.backend.dto.analytics.OwnerSummaryResponse;
import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.enums.ComplaintCategory;
import com.pgms.backend.entity.enums.ComplaintStatus;
import com.pgms.backend.entity.enums.RentStatus;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.ServiceStatus;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.entity.enums.VacateStatus;
import com.pgms.backend.repository.ComplaintRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.RentRecordRepository;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.repository.ServiceBookingRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.VacateNoticeRepository;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.List;

@Service
public class AnalyticsService {

    private final PgRepository pgRepository;
    private final RoomRepository roomRepository;
    private final TenantProfileRepository tenantProfileRepository;
    private final RentRecordRepository rentRecordRepository;
    private final ComplaintRepository complaintRepository;
    private final VacateNoticeRepository vacateNoticeRepository;
    private final ServiceBookingRepository serviceBookingRepository;
    private final AccessControlService accessControlService;

    public AnalyticsService(PgRepository pgRepository,
                            RoomRepository roomRepository,
                            TenantProfileRepository tenantProfileRepository,
                            RentRecordRepository rentRecordRepository,
                            ComplaintRepository complaintRepository,
                            VacateNoticeRepository vacateNoticeRepository,
                            ServiceBookingRepository serviceBookingRepository,
                            AccessControlService accessControlService) {
        this.pgRepository = pgRepository;
        this.roomRepository = roomRepository;
        this.tenantProfileRepository = tenantProfileRepository;
        this.rentRecordRepository = rentRecordRepository;
        this.complaintRepository = complaintRepository;
        this.vacateNoticeRepository = vacateNoticeRepository;
        this.serviceBookingRepository = serviceBookingRepository;
        this.accessControlService = accessControlService;
    }

    public OwnerSummaryResponse ownerSummary() {
        String currentMonth = YearMonth.now().toString();
        List<RentRecord> monthlyRecords = rentRecordRepository.findByBillingMonth(currentMonth);
        return OwnerSummaryResponse.builder()
                .totalPgs((int) pgRepository.count())
                .totalRooms((int) roomRepository.count())
                .totalVacantRooms((int) roomRepository.countByStatus(RoomStatus.VACANT))
                .totalActiveTenants((int) tenantProfileRepository.countByStatus(TenantStatus.ACTIVE))
                .totalVacatingTenants((int) tenantProfileRepository.countByStatus(TenantStatus.VACATING))
                .totalRentCollectedThisMonth(monthlyRecords.stream().mapToDouble(RentRecord::getAmountPaid).sum())
                .totalRentPendingThisMonth(monthlyRecords.stream().mapToDouble(record -> Math.max(record.getTotalDue() - record.getAmountPaid(), 0)).sum())
                .totalFinesOutstanding(monthlyRecords.stream()
                        .filter(record -> record.getStatus() != RentStatus.PAID)
                        .mapToDouble(RentRecord::getFineAccrued).sum())
                .openComplaints((int) complaintRepository.countByStatus(ComplaintStatus.OPEN))
                .escalatedComplaints((int) complaintRepository.countByStatus(ComplaintStatus.ESCALATED))
                .managerComplaints((int) complaintRepository.countByCategory(ComplaintCategory.AGAINST_MANAGER))
                .advanceRefundQueue(vacateNoticeRepository.findByStatus(VacateStatus.COMPLETED).stream()
                        .map(notice -> new AdvanceRefundItemResponse(
                                notice.getTenantProfile().getUser().getName(),
                                notice.getTenantProfile().getRoom().getRoomNumber(),
                                notice.getAdvanceRefundAmount()))
                        .toList())
                .build();
    }

    public ManagerSummaryResponse managerSummary() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return ManagerSummaryResponse.builder()
                    .occupancyRate(0.0)
                    .totalRooms(0)
                    .occupiedRooms(0)
                    .paymentCollectedThisMonth(0.0)
                    .paymentPendingThisMonth(0.0)
                    .openComplaints(0)
                    .pendingServiceRequests(0)
                    .vacateNotices(List.of())
                    .build();
        }
        String currentMonth = YearMonth.now().toString();
        List<RentRecord> monthlyRecords = rentRecordRepository.findByTenantProfilePgIdInOrderByBillingMonthDesc(pgIds).stream()
                .filter(record -> currentMonth.equals(record.getBillingMonth()))
                .toList();
        int totalRooms = pgIds.stream()
                .mapToInt(pgId -> roomRepository.findByPgId(pgId).size())
                .sum();
        int occupiedRooms = pgIds.stream()
                .mapToInt(pgId -> (int) roomRepository.countByPgIdAndStatus(pgId, RoomStatus.OCCUPIED))
                .sum();
        return ManagerSummaryResponse.builder()
                .occupancyRate(totalRooms == 0 ? 0 : (occupiedRooms * 100.0) / totalRooms)
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .paymentCollectedThisMonth(monthlyRecords.stream().mapToDouble(RentRecord::getAmountPaid).sum())
                .paymentPendingThisMonth(monthlyRecords.stream().mapToDouble(record -> Math.max(record.getTotalDue() - record.getAmountPaid(), 0)).sum())
                .openComplaints((int) pgIds.stream()
                        .flatMap(pgId -> complaintRepository.findByTenantProfilePgIdAndCategoryNotOrderByCreatedAtDesc(pgId, ComplaintCategory.AGAINST_MANAGER).stream())
                        .filter(c -> c.getStatus() == ComplaintStatus.OPEN || c.getStatus() == ComplaintStatus.IN_PROGRESS)
                        .count())
                .pendingServiceRequests((int) pgIds.stream()
                        .mapToLong(pgId -> serviceBookingRepository.countByTenantProfilePgIdAndStatus(pgId, ServiceStatus.REQUESTED))
                        .sum())
                .vacateNotices(pgIds.stream()
                        .flatMap(pgId -> vacateNoticeRepository.findByTenantProfilePgId(pgId).stream())
                        .filter(notice -> notice.getStatus() != VacateStatus.COMPLETED)
                        .map(notice -> new ManagerVacateItemResponse(
                                notice.getTenantProfile().getUser().getName(),
                                notice.getIntendedVacateDate(),
                                notice.getRefundEligible()))
                        .toList())
                .build();
    }
}
