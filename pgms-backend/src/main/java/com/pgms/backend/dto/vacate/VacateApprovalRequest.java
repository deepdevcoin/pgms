package com.pgms.backend.dto.vacate;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VacateApprovalRequest {
    @NotNull(message = "approve flag is required")
    private Boolean approve;
}
