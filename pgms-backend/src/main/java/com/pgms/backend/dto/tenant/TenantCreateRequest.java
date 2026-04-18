package com.pgms.backend.dto.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TenantCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;
    @NotBlank(message = "Phone is required")
    private String phone;
    @NotNull(message = "Room id is required")
    private Long roomId;
    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;
    @NotNull(message = "Advance amount is required")
    private Double advanceAmountPaid;
}
