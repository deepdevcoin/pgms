package com.pgms.backend.dto.pg;

import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private Long pgId;
    private String roomNumber;
    private Integer floor;
    private Boolean isAC;
    private SharingType sharingType;
    private Double monthlyRent;
    private Double depositAmount;
    private RoomStatus status;
}
