package com.pgms.backend.dto.service;

import com.pgms.backend.entity.enums.ServiceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ServiceStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private ServiceStatus status;
    private String notes;
}
