package com.pgms.backend.dto.tenant;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class KycReplacementRequest {
    @NotBlank(message = "Replacement note is required")
    private String notes;
}
