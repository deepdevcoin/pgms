package com.pgms.backend.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CashPaymentRequest {
    @NotNull(message = "Tenant profile id is required")
    private Long tenantProfileId;
    @NotBlank(message = "Billing month is required")
    private String billingMonth;
    @NotNull(message = "Amount is required")
    private Double amount;
}
