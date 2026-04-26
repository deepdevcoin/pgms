package com.pgms.backend.dto.service;

import com.pgms.backend.entity.enums.ServiceStatus;
import com.pgms.backend.entity.enums.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ServiceBookingResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private Long pgId;
    private String pgName;
    private String roomNumber;
    private ServiceType serviceType;
    private LocalDate preferredDate;
    private String preferredTimeWindow;
    private String requestNotes;
    private ServiceStatus status;
    private String managerNotes;
    private Integer rating;
    private String ratingComment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime rejectedAt;
}
