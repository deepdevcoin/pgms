package com.pgms.backend.dto.layout;

import com.pgms.backend.entity.enums.RentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class LayoutTenantRentSummaryResponse {
    private String billingMonth;
    private Double amountPaid;
    private Double totalDue;
    private Double remainingAmountDue;
    private LocalDate dueDate;
    private RentStatus status;
}
