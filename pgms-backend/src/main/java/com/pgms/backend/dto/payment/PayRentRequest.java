package com.pgms.backend.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayRentRequest {
    @NotNull(message = "Record id is required")
    private Long recordId;
    @NotNull(message = "Amount is required")
    private Double amount;
}
