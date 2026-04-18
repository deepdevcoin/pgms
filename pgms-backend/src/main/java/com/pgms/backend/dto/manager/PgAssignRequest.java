package com.pgms.backend.dto.manager;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PgAssignRequest {
    @NotNull(message = "pgIds is required")
    private List<Long> pgIds;
}
