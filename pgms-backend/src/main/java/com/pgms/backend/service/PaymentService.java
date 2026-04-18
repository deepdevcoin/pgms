package com.pgms.backend.service;

import com.pgms.backend.dto.payment.CashPaymentRequest;
import com.pgms.backend.dto.payment.RentRecordResponse;
import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.RentStatus;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.RentRecordRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class PaymentService {

    private final RentRecordRepository rentRecordRepository;
    private final AccessControlService accessControlService;
    private final TenantProfileRepository tenantProfileRepository;

    public PaymentService(RentRecordRepository rentRecordRepository,
                          AccessControlService accessControlService,
                          TenantProfileRepository tenantProfileRepository) {
        this.rentRecordRepository = rentRecordRepository;
        this.accessControlService = accessControlService;
        this.tenantProfileRepository = tenantProfileRepository;
    }

    public List<RentRecordResponse> getTenantPayments() {
        return rentRecordRepository.findByTenantProfileUserIdOrderByBillingMonthDesc(
                accessControlService.getCurrentTenantProfile().getUser().getId()).stream().map(this::toResponse).toList();
    }

    public List<RentRecordResponse> getManagerPayments() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return rentRecordRepository.findByTenantProfilePgIdOrderByBillingMonthDesc(pgId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public RentRecordResponse payByTenant(Long recordId, Double amount) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        if (!record.getTenantProfile().getUser().getId().equals(accessControlService.getCurrentTenantProfile().getUser().getId())) {
            throw new BadRequestException("Rent record does not belong to the current tenant");
        }
        applyPayment(record, amount);
        return toResponse(rentRecordRepository.save(record));
    }

    @Transactional
    public RentRecordResponse recordCashPayment(CashPaymentRequest request) {
        TenantProfile tenant = tenantProfileRepository.findById(request.getTenantProfileId())
                .orElseThrow(() -> new NotFoundException("Tenant profile not found"));
        accessControlService.ensureManagerAssignedToPg(tenant.getPg().getId());
        RentRecord record = rentRecordRepository.findByTenantProfileIdAndBillingMonth(tenant.getId(), request.getBillingMonth())
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        applyPayment(record, request.getAmount());
        return toResponse(rentRecordRepository.save(record));
    }

    @Transactional
    public RentRecordResponse waiveFine(Long recordId, String reason) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        accessControlService.ensureManagerAssignedToPg(record.getTenantProfile().getPg().getId());
        record.setFineAccrued(0.0);
        record.setFineWaivedReason(reason);
        recalculateTotals(record);
        return toResponse(rentRecordRepository.save(record));
    }

    @Transactional
    public RentRecordResponse applyWalletCredit(Long recordId) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        if (!record.getTenantProfile().getId().equals(profile.getId())) {
            throw new BadRequestException("Rent record does not belong to the current tenant");
        }
        double remaining = remainingAmount(record);
        double deduction = Math.min(profile.getCreditWalletBalance(), remaining);
        profile.setCreditWalletBalance(profile.getCreditWalletBalance() - deduction);
        record.setAmountPaid(record.getAmountPaid() + deduction);
        updateStatus(record);
        tenantProfileRepository.save(profile);
        return toResponse(rentRecordRepository.save(record));
    }

    @Transactional
    @Scheduled(cron = "0 1 0 1 * *")
    public void generateMonthlyRentRecords() {
        String billingMonth = YearMonth.now().toString();
        List<TenantProfile> activeTenants = tenantProfileRepository.findAll().stream()
                .filter(profile -> profile.getStatus() == TenantStatus.ACTIVE || profile.getStatus() == TenantStatus.VACATING)
                .toList();
        for (TenantProfile tenant : activeTenants) {
            if (rentRecordRepository.findByTenantProfileIdAndBillingMonth(tenant.getId(), billingMonth).isPresent()) {
                continue;
            }
            RentRecord record = RentRecord.builder()
                    .tenantProfile(tenant)
                    .billingMonth(billingMonth)
                    .rentAmount(tenant.getRoom().getMonthlyRent())
                    .ebAmount(0.0)
                    .fineAccrued(0.0)
                    .amountPaid(0.0)
                    .totalDue(tenant.getRoom().getMonthlyRent())
                    .dueDate(LocalDate.of(LocalDate.now().getYear(), LocalDate.now().getMonth(), tenant.getPg().getPaymentDeadlineDay()))
                    .status(RentStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();
            rentRecordRepository.save(record);
        }
    }

    @Transactional
    @Scheduled(cron = "0 5 0 * * *")
    public void calculateDailyFines() {
        LocalDate today = LocalDate.now();
        List<RentRecord> records = rentRecordRepository.findByStatusInAndDueDateBefore(List.of(RentStatus.PENDING, RentStatus.PARTIAL, RentStatus.OVERDUE), today);
        for (RentRecord record : records) {
            record.setFineAccrued(record.getFineAccrued() + record.getTenantProfile().getPg().getFineAmountPerDay());
            recalculateTotals(record);
            if (record.getStatus() != RentStatus.PAID) {
                record.setStatus(RentStatus.OVERDUE);
            }
            rentRecordRepository.save(record);
        }
    }

    public RentRecordResponse toResponse(RentRecord record) {
        return RentRecordResponse.builder()
                .id(record.getId())
                .tenantProfileId(record.getTenantProfile().getId())
                .tenantName(record.getTenantProfile().getUser().getName())
                .roomNumber(record.getTenantProfile().getRoom().getRoomNumber())
                .billingMonth(record.getBillingMonth())
                .rentAmount(record.getRentAmount())
                .ebAmount(record.getEbAmount())
                .fineAccrued(record.getFineAccrued())
                .amountPaid(record.getAmountPaid())
                .totalDue(record.getTotalDue())
                .remainingAmountDue(remainingAmount(record))
                .dueDate(record.getDueDate())
                .status(record.getStatus())
                .fineWaivedReason(record.getFineWaivedReason())
                .build();
    }

    private void applyPayment(RentRecord record, Double amount) {
        if (amount == null || amount <= 0) {
            throw new BadRequestException("Amount must be greater than zero");
        }
        record.setAmountPaid(record.getAmountPaid() + amount);
        updateStatus(record);
    }

    private void recalculateTotals(RentRecord record) {
        record.setTotalDue(record.getRentAmount() + record.getEbAmount() + record.getFineAccrued());
        updateStatus(record);
    }

    private void updateStatus(RentRecord record) {
        if (record.getTotalDue() == null) {
            record.setTotalDue(record.getRentAmount() + record.getEbAmount() + record.getFineAccrued());
        }
        double remaining = remainingAmount(record);
        if (remaining <= 0) {
            record.setStatus(RentStatus.PAID);
        } else if (record.getAmountPaid() > 0) {
            record.setStatus(record.getDueDate().isBefore(LocalDate.now()) ? RentStatus.OVERDUE : RentStatus.PARTIAL);
        } else if (record.getDueDate().isBefore(LocalDate.now())) {
            record.setStatus(RentStatus.OVERDUE);
        } else {
            record.setStatus(RentStatus.PENDING);
        }
    }

    private double remainingAmount(RentRecord record) {
        double totalDue = record.getTotalDue() != null ? record.getTotalDue() : record.getRentAmount() + record.getEbAmount() + record.getFineAccrued();
        return Math.max(totalDue - record.getAmountPaid(), 0);
    }
}
