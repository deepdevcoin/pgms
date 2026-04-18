package com.pgms.backend.dto.payment;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WaiveFineRequest {
    @NotBlank(message = "Reason is required")
    private String reason;
}
