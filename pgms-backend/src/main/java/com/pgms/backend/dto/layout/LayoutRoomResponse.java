package com.pgms.backend.dto.layout;

import com.pgms.backend.entity.enums.CleaningStatus;
import com.pgms.backend.entity.enums.SharingType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LayoutRoomResponse {
    private Long roomId;
    private String roomNumber;
    private Integer floor;
    private Integer capacity;
    private Integer occupiedCount;
    private Integer vacantSlots;
    private LayoutRoomStatus status;
    private CleaningStatus cleaningStatus;
    private Double monthlyRent;
    private Double depositAmount;
    private Double totalDepositRequired;
    private Double totalDepositPaid;
    private Boolean isAC;
    private SharingType sharingType;
    private List<LayoutTenantResponse> tenants;
}
