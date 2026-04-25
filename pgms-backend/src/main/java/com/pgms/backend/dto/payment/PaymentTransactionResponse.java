package com.pgms.backend.dto.payment;

import com.pgms.backend.entity.enums.PaymentMethod;
import com.pgms.backend.entity.enums.PaymentTransactionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentTransactionResponse {
    private Long id;
    private Long rentRecordId;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private String billingMonth;
    private PaymentTransactionType transactionType;
    private PaymentMethod paymentMethod;
    private Double amount;
    private Double signedAmount;
    private Double outstandingBefore;
    private Double outstandingAfter;
    private Double walletBalanceBefore;
    private Double walletBalanceAfter;
    private String notes;
    private String createdByName;
    private LocalDateTime createdAt;
}
