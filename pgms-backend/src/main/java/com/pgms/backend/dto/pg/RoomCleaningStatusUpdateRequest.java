package com.pgms.backend.dto.pg;

import com.pgms.backend.entity.enums.CleaningStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoomCleaningStatusUpdateRequest {
    @NotNull(message = "Cleaning status is required")
    private CleaningStatus cleaningStatus;
}
