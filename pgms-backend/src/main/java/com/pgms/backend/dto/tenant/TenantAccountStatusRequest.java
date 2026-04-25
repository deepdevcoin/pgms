package com.pgms.backend.dto.tenant;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TenantAccountStatusRequest {
    @NotNull(message = "Active flag is required")
    private Boolean active;
}
