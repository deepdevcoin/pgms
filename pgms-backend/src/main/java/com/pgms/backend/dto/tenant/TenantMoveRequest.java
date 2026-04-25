package com.pgms.backend.dto.tenant;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TenantMoveRequest {
    @NotNull(message = "Target room is required")
    private Long roomId;
}
