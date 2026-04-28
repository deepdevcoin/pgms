package com.pgms.backend.dto.vacate;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VacateRejectRequest {
    @NotBlank(message = "Message is required")
    private String message;
}
