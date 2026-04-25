package com.pgms.backend.dto.amenity;

import com.pgms.backend.entity.enums.AmenityType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AmenitySlotCreateRequest {
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
    private Integer capacity;
    private String facilityName;
}
