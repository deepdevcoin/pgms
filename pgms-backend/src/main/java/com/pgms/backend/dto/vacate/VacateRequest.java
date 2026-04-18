package com.pgms.backend.dto.vacate;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VacateRequest {
    @NotNull(message = "Intended vacate date is required")
    private LocalDate intendedVacateDate;
    @NotNull(message = "Referral choice is required")
    private Boolean hasReferral;
    private String referralName;
    private String referralPhone;
    private String referralEmail;
}
