package com.pgms.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class ManagerVacateItemResponse {
    private String tenantName;
    private LocalDate intendedDate;
    private Boolean refundEligible;
}
