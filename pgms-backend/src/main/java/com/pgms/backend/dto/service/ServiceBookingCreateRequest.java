package com.pgms.backend.dto.service;

import com.pgms.backend.entity.enums.ServiceType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ServiceBookingCreateRequest {
    @NotNull(message = "Service type is required")
    private ServiceType serviceType;
    @NotNull(message = "Preferred date is required")
    private LocalDate preferredDate;
    private String preferredTimeWindow;
}
