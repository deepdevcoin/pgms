package com.pgms.backend.dto.amenity;

import com.pgms.backend.entity.enums.AmenityType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class AmenityConfigResponse {
    private Long id;
    private Long pgId;
    private AmenityType amenityType;
    private String displayName;
    private String resourceName;
    private String facilityName;
    private Integer unitCount;
    private Integer capacity;
    private Integer slotDurationMinutes;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean enabled;
    private boolean maintenanceMode;
    private long upcomingOpenSlots;
    private long upcomingBookedSlots;
}
