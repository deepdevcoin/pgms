package com.pgms.backend.dto.pg;

import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import lombok.Data;

@Data
public class RoomUpdateRequest {
    private Double monthlyRent;
    private Boolean isAC;
    private SharingType sharingType;
    private RoomStatus status;
}
