package com.pgms.backend.dto.amenity;

import com.pgms.backend.entity.enums.AmenityType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AmenitySlotUpdateRequest {
    @NotNull(message = "PG is required")
    private Long pgId;
    @NotNull(message = "Amenity type is required")
    private AmenityType amenityType;
    @NotNull(message = "Slot date is required")
    private LocalDate slotDate;
    @NotNull(message = "Start time is required")
    private LocalTime startTime;
    @NotNull(message = "End time is required")
    private LocalTime endTime;
    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;
    @Min(value = 1, message = "Generation days must be at least 1")
    private Integer generationDays;
    private String facilityName;
    private String resourceName;
}
