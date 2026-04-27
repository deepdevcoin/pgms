package com.pgms.backend.dto.pg;

import com.pgms.backend.entity.enums.CleaningStatus;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class RoomUpdateRequest {
    private String roomNumber;
    @Min(value = 1, message = "Floor must be at least 1")
    private Integer floor;

    @DecimalMin(value = "0.0", inclusive = false, message = "Monthly rent must be greater than zero")
    private Double monthlyRent;

    @DecimalMin(value = "0.0", inclusive = false, message = "Deposit amount must be greater than zero")
    private Double depositAmount;

    private Boolean isAC;
    private SharingType sharingType;
    private RoomStatus status;
    private CleaningStatus cleaningStatus;
}
