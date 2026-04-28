package com.pgms.backend.dto.vacate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VacateRequest {
    @NotNull(message = "Intended vacate date is required")
    private LocalDate intendedVacateDate;
    @NotNull(message = "Referral choice is required")
    private Boolean hasReferral;
    private String referralName;
    @Pattern(regexp = "^$|\\d{10}", message = "Referral phone must be exactly 10 digits")
    private String referralPhone;
    @Email(message = "Referral email must be valid")
    private String referralEmail;
}
