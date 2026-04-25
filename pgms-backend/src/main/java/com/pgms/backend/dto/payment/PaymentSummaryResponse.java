package com.pgms.backend.dto.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentSummaryResponse {
    private String currentBillingMonth;
    private int totalRecords;
    private int paidRecords;
    private int partialRecords;
    private int pendingRecords;
    private int overdueRecords;
    private int tenantCount;
    private int transactionCount;
    private Double totalDue;
    private Double totalPaid;
    private Double totalOutstanding;
    private Double overdueAmount;
    private Double fineOutstanding;
    private Double walletBalance;
}
