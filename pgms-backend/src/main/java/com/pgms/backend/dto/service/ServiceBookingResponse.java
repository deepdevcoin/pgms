package com.pgms.backend.dto.service;

import com.pgms.backend.entity.enums.ServiceStatus;
import com.pgms.backend.entity.enums.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ServiceBookingResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private ServiceType serviceType;
    private LocalDate preferredDate;
    private String preferredTimeWindow;
    private ServiceStatus status;
    private String notes;
    private Integer rating;
    private String ratingComment;
}
