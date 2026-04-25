package com.pgms.backend.dto.pg;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PgCreateRequest {
    @NotBlank(message = "PG name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Total floors is required")
    @Min(value = 1, message = "Total floors must be at least 1")
    private Integer totalFloors;

    @NotNull(message = "Payment deadline day is required")
    @Min(value = 1, message = "Payment deadline day must be between 1 and 28")
    @Max(value = 28, message = "Payment deadline day must be between 1 and 28")
    private Integer paymentDeadlineDay;

    @NotNull(message = "Fine amount per day is required")
    @Min(value = 0, message = "Fine amount per day must be positive")
    private Integer fineAmountPerDay;

    @NotNull(message = "SLA hours is required")
    @Min(value = 1, message = "SLA hours must be at least 1")
    private Integer slaHours;
}
