package com.pgms.backend.dto.payment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class ApplyCreditRequest {
    @NotNull(message = "Rent record id is required")
    private Long rentRecordId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private Double amount;
}
