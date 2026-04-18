package com.pgms.backend.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApplyCreditRequest {
    @NotNull(message = "Rent record id is required")
    private Long rentRecordId;
}
