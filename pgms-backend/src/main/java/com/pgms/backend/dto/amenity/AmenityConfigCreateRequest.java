package com.pgms.backend.dto.amenity;

import com.pgms.backend.entity.enums.AmenityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class AmenityConfigCreateRequest {
    @NotNull(message = "PG is required")
    private Long pgId;
    @NotNull(message = "Amenity type is required")
    private AmenityType amenityType;
    @NotBlank(message = "Amenity name is required")
    private String displayName;
    @NotBlank(message = "Unit label is required")
    private String resourceName;
    @NotBlank(message = "Location is required")
    private String facilityName;
    private Integer unitCount;
    private Integer capacity;
    private Integer slotDurationMinutes;
    @NotNull(message = "Start time is required")
    private LocalTime startTime;
    @NotNull(message = "End time is required")
    private LocalTime endTime;
    @NotNull(message = "Enabled flag is required")
    private Boolean enabled;
    @NotNull(message = "Maintenance flag is required")
    private Boolean maintenanceMode;
}
