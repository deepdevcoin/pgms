package com.pgms.backend.dto.amenity;

import com.pgms.backend.entity.enums.AmenityType;
import com.pgms.backend.entity.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class AmenityBookingResponse {
    private Long bookingId;
    private Long slotId;
    private Long pgId;
    private String tenantName;
    private AmenityType amenityType;
    private String facilityName;
    private LocalDate slotDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer capacity;
    private Long bookingCount;
    private boolean openInvite;
    private BookingStatus status;
}
