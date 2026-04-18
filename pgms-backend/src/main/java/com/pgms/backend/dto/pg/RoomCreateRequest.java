package com.pgms.backend.dto.pg;

import com.pgms.backend.entity.enums.CleaningStatus;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoomCreateRequest {
    @NotBlank(message = "Room number is required")
    private String roomNumber;

    @NotNull(message = "Floor is required")
    private Integer floor;

    @NotNull(message = "AC status is required")
    private Boolean isAC;

    @NotNull(message = "Sharing type is required")
    private SharingType sharingType;

    @NotNull(message = "Monthly rent is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Monthly rent must be greater than zero")
    private Double monthlyRent;

    @NotNull(message = "Deposit amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Deposit amount must be greater than zero")
    private Double depositAmount;

    private RoomStatus status;
    private CleaningStatus cleaningStatus;
}
