package com.pgms.backend.dto.payment;

import com.pgms.backend.entity.enums.RentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class RentRecordResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private String billingMonth;
    private Double rentAmount;
    private Double ebAmount;
    private Double fineAccrued;
    private Double amountPaid;
    private Double totalDue;
    private Double remainingAmountDue;
    private LocalDate dueDate;
    private RentStatus status;
    private String fineWaivedReason;
}
