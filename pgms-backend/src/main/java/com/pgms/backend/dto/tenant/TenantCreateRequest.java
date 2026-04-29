package com.pgms.backend.dto.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TenantCreateRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 80, message = "Name must be between 2 and 80 characters")
    private String name;
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    @Size(max = 120, message = "Email must be at most 120 characters")
    private String email;
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "\\d{10}", message = "Phone must be exactly 10 digits")
    private String phone;
    @NotNull(message = "Room id is required")
    private Long roomId;
    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;
    @NotNull(message = "Advance amount is required")
    @PositiveOrZero(message = "Advance amount cannot be negative")
    private Double advanceAmountPaid;
}
