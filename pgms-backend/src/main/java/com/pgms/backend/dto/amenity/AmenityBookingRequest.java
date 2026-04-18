package com.pgms.backend.dto.amenity;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AmenityBookingRequest {
    @NotNull(message = "Slot id is required")
    private Long slotId;
    @NotNull(message = "Open invite flag is required")
    private Boolean isOpenInvite;
}
