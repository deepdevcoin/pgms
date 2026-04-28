package com.pgms.backend.service;

import com.pgms.backend.dto.payment.CashPaymentRequest;
import com.pgms.backend.dto.payment.PaymentOverviewResponse;
import com.pgms.backend.dto.payment.PaymentSummaryResponse;
import com.pgms.backend.dto.payment.PaymentTransactionResponse;
import com.pgms.backend.dto.payment.RentRecordResponse;
import com.pgms.backend.entity.PaymentTransaction;
import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.PaymentMethod;
import com.pgms.backend.entity.enums.PaymentTransactionType;
import com.pgms.backend.entity.enums.RentStatus;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.ForbiddenException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.PaymentTransactionRepository;
import com.pgms.backend.repository.RentRecordRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.UserRepository;
import com.pgms.backend.util.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PaymentService {

    private final RentRecordRepository rentRecordRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final AccessControlService accessControlService;
    private final TenantProfileRepository tenantProfileRepository;
    private final UserRepository userRepository;

    public PaymentService(RentRecordRepository rentRecordRepository,
                          PaymentTransactionRepository paymentTransactionRepository,
                          AccessControlService accessControlService,
                          TenantProfileRepository tenantProfileRepository,
                          UserRepository userRepository) {
        this.rentRecordRepository = rentRecordRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.accessControlService = accessControlService;
        this.tenantProfileRepository = tenantProfileRepository;
        this.userRepository = userRepository;
    }

    public List<RentRecordResponse> getTenantPayments() {
        syncPaymentsForTenant(accessControlService.getCurrentTenantProfile());
        return rentRecordRepository.findByTenantProfileUserIdOrderByBillingMonthDesc(
                accessControlService.getCurrentTenantProfile().getUser().getId()).stream().map(this::toResponse).toList();
    }

    public List<RentRecordResponse> getManagerPayments() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        syncPaymentsForPgIds(pgIds);
        return rentRecordRepository.findByTenantProfilePgIdInOrderByBillingMonthDesc(pgIds).stream().map(this::toResponse).toList();
    }

    public List<RentRecordResponse> getOwnerPayments() {
        syncPaymentsForAllActiveTenants();
        return sortPaymentResponses(rentRecordRepository.findAll().stream().map(this::toResponse).toList());
    }

    public PaymentOverviewResponse getTenantPaymentOverview() {
        TenantProfile tenantProfile = accessControlService.getCurrentTenantProfile();
        syncPaymentsForTenant(tenantProfile);
        List<RentRecord> records = rentRecordRepository.findByTenantProfileUserIdOrderByBillingMonthDesc(tenantProfile.getUser().getId());
        List<PaymentTransaction> transactions = paymentTransactionRepository.findByTenantProfileUserIdOrderByCreatedAtDesc(tenantProfile.getUser().getId());
        return overview(records, transactions, tenantProfile.getCreditWalletBalance(), 1);
    }

    public PaymentOverviewResponse getManagerPaymentOverview() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return overview(List.of(), List.of(), 0.0, 0);
        }
        syncPaymentsForPgIds(pgIds);
        List<RentRecord> records = rentRecordRepository.findByTenantProfilePgIdInOrderByBillingMonthDesc(pgIds);
        List<PaymentTransaction> transactions = paymentTransactionRepository.findByTenantProfilePgIdInOrderByCreatedAtDesc(pgIds);
        double walletBalance = tenantProfileRepository.findByPgIdIn(pgIds).stream()
                .mapToDouble(profile -> profile.getCreditWalletBalance() != null ? profile.getCreditWalletBalance() : 0.0)
                .sum();
        int tenantCount = (int) records.stream().map(record -> record.getTenantProfile().getId()).distinct().count();
        return overview(records, transactions, walletBalance, tenantCount);
    }

    public PaymentOverviewResponse getOwnerPaymentOverview() {
        syncPaymentsForAllActiveTenants();
        List<RentRecord> records = rentRecordRepository.findAll();
        List<PaymentTransaction> transactions = paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
        double walletBalance = tenantProfileRepository.findAll().stream()
                .mapToDouble(profile -> profile.getCreditWalletBalance() != null ? profile.getCreditWalletBalance() : 0.0)
                .sum();
        int tenantCount = (int) records.stream().map(record -> record.getTenantProfile().getId()).distinct().count();
        return overview(records, transactions, walletBalance, tenantCount);
    }

    @Transactional
    public RentRecordResponse payByTenant(Long recordId, Double amount) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        if (!record.getTenantProfile().getUser().getId().equals(accessControlService.getCurrentTenantProfile().getUser().getId())) {
            throw new BadRequestException("Rent record does not belong to the current tenant");
        }
        reconcileRecord(record, LocalDate.now());
        double outstandingBefore = remainingAmount(record);
        applyPayment(record, amount);
        RentRecord saved = rentRecordRepository.save(record);
        logTransaction(saved, PaymentTransactionType.TENANT_PAYMENT, PaymentMethod.ONLINE, amount, outstandingBefore, remainingAmount(saved), null, null, "Tenant paid rent online");
        return toResponse(saved);
    }

    @Transactional
    public RentRecordResponse recordCashPayment(CashPaymentRequest request) {
        TenantProfile tenant = tenantProfileRepository.findById(request.getTenantProfileId())
                .orElseThrow(() -> new NotFoundException("Tenant profile not found"));
        accessControlService.ensureManagerAssignedToPg(tenant.getPg().getId());
        RentRecord record = rentRecordRepository.findByTenantProfileIdAndBillingMonth(tenant.getId(), request.getBillingMonth())
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        reconcileRecord(record, LocalDate.now());
        double outstandingBefore = remainingAmount(record);
        applyPayment(record, request.getAmount());
        RentRecord saved = rentRecordRepository.save(record);
        logTransaction(saved, PaymentTransactionType.MANAGER_CASH_COLLECTION, PaymentMethod.CASH, request.getAmount(), outstandingBefore, remainingAmount(saved), null, null, "Manager recorded cash collection");
        return toResponse(saved);
    }

    @Transactional
    public RentRecordResponse waiveFine(Long recordId, String reason) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (currentRole == Role.MANAGER) {
            accessControlService.ensureManagerAssignedToPg(record.getTenantProfile().getPg().getId());
        } else {
            throw new ForbiddenException("You are not allowed to waive fines");
        }
        reconcileRecord(record, LocalDate.now());
        double waivedAmount = record.getFineAccrued() != null ? record.getFineAccrued() : 0.0;
        if (waivedAmount <= 0) {
            throw new BadRequestException("No fine is available to waive");
        }
        double outstandingBefore = remainingAmount(record);
        record.setFineAccrued(0.0);
        record.setFineWaivedReason(reason);
        recalculateTotals(record);
        RentRecord saved = rentRecordRepository.save(record);
        logTransaction(saved, PaymentTransactionType.FINE_WAIVER, PaymentMethod.ADJUSTMENT, waivedAmount, outstandingBefore, remainingAmount(saved), null, null, reason == null || reason.isBlank() ? "Fine waived" : reason);
        return toResponse(saved);
    }

    @Transactional
    public RentRecordResponse applyWalletCredit(Long recordId, Double amount) {
        RentRecord record = rentRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("Rent record not found"));
        TenantProfile profile = accessControlService.getCurrentTenantProfile();
        if (!record.getTenantProfile().getId().equals(profile.getId())) {
            throw new BadRequestException("Rent record does not belong to the current tenant");
        }
        reconcileRecord(record, LocalDate.now());
        double remaining = remainingAmount(record);
        if (remaining <= 0) {
            throw new BadRequestException("No due amount is pending for this rent record");
        }
        double walletBefore = profile.getCreditWalletBalance() != null ? profile.getCreditWalletBalance() : 0.0;
        if (walletBefore <= 0) {
            throw new BadRequestException("No wallet balance is available");
        }
        if (amount == null || amount <= 0) {
            throw new BadRequestException("Wallet amount must be greater than zero");
        }
        if (amount > walletBefore) {
            throw new BadRequestException("Wallet amount cannot exceed the available wallet balance");
        }
        if (amount > remaining) {
            throw new BadRequestException("Wallet amount cannot exceed the remaining due");
        }
        double deduction = amount;
        profile.setCreditWalletBalance(profile.getCreditWalletBalance() - deduction);
        record.setAmountPaid(record.getAmountPaid() + deduction);
        updateStatus(record);
        tenantProfileRepository.save(profile);
        RentRecord saved = rentRecordRepository.save(record);
        logTransaction(saved, PaymentTransactionType.WALLET_CREDIT_APPLIED, PaymentMethod.WALLET, deduction, remaining, remainingAmount(saved), walletBefore, profile.getCreditWalletBalance(), "Wallet credit applied to dues");
        return toResponse(saved);
    }

    @Transactional
    @Scheduled(cron = "0 1 0 1 * *")
    public void generateMonthlyRentRecords() {
        syncPaymentsForAllActiveTenants();
    }

    @Transactional
    @Scheduled(cron = "0 5 0 * * *")
    public void calculateDailyFines() {
        LocalDate today = LocalDate.now();
        List<RentRecord> records = rentRecordRepository.findByStatusInAndDueDateBefore(List.of(RentStatus.PENDING, RentStatus.PARTIAL, RentStatus.OVERDUE), today);
        for (RentRecord record : records) {
            reconcileRecord(record, today);
        }
    }

    public RentRecordResponse toResponse(RentRecord record) {
        return RentRecordResponse.builder()
                .id(record.getId())
                .tenantProfileId(record.getTenantProfile().getId())
                .tenantName(record.getTenantProfile().getUser().getName())
                .roomNumber(record.getTenantProfile().getRoom().getRoomNumber())
                .pgId(record.getTenantProfile().getPg().getId())
                .pgName(record.getTenantProfile().getPg().getName())
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

    public PaymentTransactionResponse toTransactionResponse(PaymentTransaction transaction) {
        RentRecord rentRecord = transaction.getRentRecord();
        TenantProfile tenantProfile = transaction.getTenantProfile();
        return PaymentTransactionResponse.builder()
                .id(transaction.getId())
                .rentRecordId(rentRecord.getId())
                .tenantProfileId(tenantProfile.getId())
                .tenantName(tenantProfile.getUser().getName())
                .roomNumber(tenantProfile.getRoom().getRoomNumber())
                .billingMonth(rentRecord.getBillingMonth())
                .transactionType(transaction.getTransactionType())
                .paymentMethod(transaction.getPaymentMethod())
                .amount(transaction.getAmount())
                .signedAmount(transaction.getSignedAmount())
                .outstandingBefore(transaction.getOutstandingBefore())
                .outstandingAfter(transaction.getOutstandingAfter())
                .walletBalanceBefore(transaction.getWalletBalanceBefore())
                .walletBalanceAfter(transaction.getWalletBalanceAfter())
                .notes(transaction.getNotes())
                .createdByName(transaction.getCreatedBy() != null ? transaction.getCreatedBy().getName() : "System")
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    private void applyPayment(RentRecord record, Double amount) {
        if (amount == null || amount <= 0) {
            throw new BadRequestException("Amount must be greater than zero");
        }
        double outstanding = remainingAmount(record);
        if (outstanding <= 0) {
            throw new BadRequestException("This rent record is already fully paid");
        }
        if (amount > outstanding) {
            throw new BadRequestException("Amount cannot exceed the remaining due");
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

    @Transactional
    public RentRecord ensureCurrentMonthRentRecord(TenantProfile tenantProfile) {
        return ensureMonthlyRentRecord(tenantProfile, YearMonth.now());
    }

    private void syncPaymentsForAllActiveTenants() {
        List<TenantProfile> activeTenants = tenantProfileRepository.findAll().stream()
                .filter(profile -> profile.getStatus() == TenantStatus.ACTIVE || profile.getStatus() == TenantStatus.VACATING)
                .toList();
        syncPaymentsForTenants(activeTenants);
    }

    private void syncPaymentsForPgIds(List<Long> pgIds) {
        List<TenantProfile> tenants = tenantProfileRepository.findByPgIdIn(pgIds).stream()
                .filter(profile -> profile.getStatus() == TenantStatus.ACTIVE || profile.getStatus() == TenantStatus.VACATING)
                .toList();
        syncPaymentsForTenants(tenants);
    }

    private void syncPaymentsForTenant(TenantProfile tenantProfile) {
        syncPaymentsForTenants(List.of(tenantProfile));
    }

    private void syncPaymentsForTenants(List<TenantProfile> tenants) {
        LocalDate today = LocalDate.now();
        for (TenantProfile tenant : tenants) {
            RentRecord record = ensureMonthlyRentRecord(tenant, YearMonth.from(today));
            reconcileRecord(record, today);
        }
    }

    private RentRecord ensureMonthlyRentRecord(TenantProfile tenant, YearMonth billingMonth) {
        String billingMonthKey = billingMonth.toString();
        return rentRecordRepository.findByTenantProfileIdAndBillingMonth(tenant.getId(), billingMonthKey)
                .orElseGet(() -> {
                    RentRecord created = rentRecordRepository.save(RentRecord.builder()
                            .tenantProfile(tenant)
                            .billingMonth(billingMonthKey)
                            .rentAmount(tenant.getRoom().getMonthlyRent())
                            .ebAmount(0.0)
                            .fineAccrued(0.0)
                            .amountPaid(0.0)
                            .totalDue(tenant.getRoom().getMonthlyRent())
                            .dueDate(LocalDate.of(billingMonth.getYear(), billingMonth.getMonth(), tenant.getPg().getPaymentDeadlineDay()))
                            .lastFineAppliedDate(null)
                            .status(RentStatus.PENDING)
                            .createdAt(LocalDateTime.now())
                            .build());
                    logTransaction(created, PaymentTransactionType.RENT_CHARGE, PaymentMethod.SYSTEM, created.getTotalDue(), 0.0, created.getTotalDue(), null, null, "Monthly rent generated");
                    return created;
                });
    }

    private void reconcileRecord(RentRecord record, LocalDate today) {
        if (record == null) {
            return;
        }
        if (record.getStatus() == RentStatus.PAID) {
            updateStatus(record);
            rentRecordRepository.save(record);
            return;
        }
        if (!record.getDueDate().isBefore(today)) {
            updateStatus(record);
            rentRecordRepository.save(record);
            return;
        }

        LocalDate baseline = record.getLastFineAppliedDate() != null ? record.getLastFineAppliedDate() : record.getDueDate();
        long daysToApply = ChronoUnit.DAYS.between(baseline, today);
        if (daysToApply > 0) {
            double outstandingBefore = remainingAmount(record);
            double fineToAdd = record.getTenantProfile().getPg().getFineAmountPerDay() * daysToApply;
            record.setFineAccrued((record.getFineAccrued() != null ? record.getFineAccrued() : 0.0) + fineToAdd);
            record.setLastFineAppliedDate(today);
            recalculateTotals(record);
            record.setStatus(record.getStatus() == RentStatus.PAID ? RentStatus.PAID : RentStatus.OVERDUE);
            RentRecord saved = rentRecordRepository.save(record);
            logTransaction(
                    saved,
                    PaymentTransactionType.LATE_FEE_APPLIED,
                    PaymentMethod.SYSTEM,
                    fineToAdd,
                    outstandingBefore,
                    remainingAmount(saved),
                    null,
                    null,
                    daysToApply == 1 ? "Daily late fee applied" : "Late fee applied for " + daysToApply + " overdue days"
            );
            return;
        }

        updateStatus(record);
        if (record.getStatus() != RentStatus.PAID) {
            record.setStatus(RentStatus.OVERDUE);
        }
        rentRecordRepository.save(record);
    }

    private PaymentOverviewResponse overview(List<RentRecord> records,
                                             List<PaymentTransaction> transactions,
                                             Double walletBalance,
                                             int tenantCount) {
        List<RentRecordResponse> recordResponses = sortPaymentResponses(records.stream().map(this::toResponse).toList());
        List<PaymentTransactionResponse> transactionResponses = transactions.stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(this::toTransactionResponse)
                .toList();

        PaymentSummaryResponse summary = PaymentSummaryResponse.builder()
                .currentBillingMonth(YearMonth.now().toString())
                .totalRecords(recordResponses.size())
                .paidRecords((int) records.stream().filter(record -> record.getStatus() == RentStatus.PAID).count())
                .partialRecords((int) records.stream().filter(record -> record.getStatus() == RentStatus.PARTIAL).count())
                .pendingRecords((int) records.stream().filter(record -> record.getStatus() == RentStatus.PENDING).count())
                .overdueRecords((int) records.stream().filter(record -> record.getStatus() == RentStatus.OVERDUE).count())
                .tenantCount(tenantCount)
                .transactionCount(transactionResponses.size())
                .totalDue(records.stream().mapToDouble(record -> record.getTotalDue() != null ? record.getTotalDue() : 0.0).sum())
                .totalPaid(records.stream().mapToDouble(record -> record.getAmountPaid() != null ? record.getAmountPaid() : 0.0).sum())
                .totalOutstanding(records.stream().mapToDouble(this::remainingAmount).sum())
                .overdueAmount(records.stream()
                        .filter(record -> record.getStatus() == RentStatus.OVERDUE)
                        .mapToDouble(this::remainingAmount)
                        .sum())
                .fineOutstanding(records.stream().mapToDouble(record -> record.getFineAccrued() != null ? record.getFineAccrued() : 0.0).sum())
                .walletBalance(walletBalance != null ? walletBalance : 0.0)
                .build();

        return PaymentOverviewResponse.builder()
                .summary(summary)
                .records(recordResponses)
                .transactions(transactionResponses)
                .build();
    }

    private List<RentRecordResponse> sortPaymentResponses(List<RentRecordResponse> records) {
        return records.stream()
                .sorted((left, right) -> {
                    int monthCompare = String.valueOf(right.getBillingMonth()).compareTo(String.valueOf(left.getBillingMonth()));
                    if (monthCompare != 0) return monthCompare;
                    int pendingCompare = Double.compare(
                            right.getRemainingAmountDue() != null ? right.getRemainingAmountDue() : 0.0,
                            left.getRemainingAmountDue() != null ? left.getRemainingAmountDue() : 0.0
                    );
                    if (pendingCompare != 0) return pendingCompare;
                    return String.valueOf(left.getTenantName()).compareToIgnoreCase(String.valueOf(right.getTenantName()));
                })
                .toList();
    }

    private void logTransaction(RentRecord record,
                                PaymentTransactionType transactionType,
                                PaymentMethod paymentMethod,
                                Double amount,
                                Double outstandingBefore,
                                Double outstandingAfter,
                                Double walletBalanceBefore,
                                Double walletBalanceAfter,
                                String notes) {
        User actor = SecurityUtils.getCurrentUserId() == null
                ? null
                : userRepository.findById(SecurityUtils.getCurrentUserId()).orElse(null);
        double normalizedAmount = amount != null ? amount : 0.0;
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .rentRecord(record)
                .tenantProfile(record.getTenantProfile())
                .createdBy(actor)
                .transactionType(transactionType)
                .paymentMethod(paymentMethod)
                .amount(normalizedAmount)
                .signedAmount(signedAmount(transactionType, normalizedAmount))
                .outstandingBefore(outstandingBefore != null ? outstandingBefore : remainingAmount(record))
                .outstandingAfter(outstandingAfter != null ? outstandingAfter : remainingAmount(record))
                .walletBalanceBefore(walletBalanceBefore)
                .walletBalanceAfter(walletBalanceAfter)
                .notes(notes)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private double signedAmount(PaymentTransactionType transactionType, double amount) {
        return switch (transactionType) {
            case RENT_CHARGE, LATE_FEE_APPLIED -> amount;
            case TENANT_PAYMENT, MANAGER_CASH_COLLECTION, WALLET_CREDIT_APPLIED, FINE_WAIVER -> -amount;
        };
    }
}
