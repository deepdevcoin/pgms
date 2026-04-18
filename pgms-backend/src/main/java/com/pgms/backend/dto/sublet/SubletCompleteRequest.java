package com.pgms.backend.dto.sublet;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SubletCompleteRequest {
    @NotBlank(message = "Guest name is required")
    private String guestName;
    @NotBlank(message = "Guest phone is required")
    private String guestPhone;
    @NotNull(message = "Check in date is required")
    private LocalDate checkInDate;
}
