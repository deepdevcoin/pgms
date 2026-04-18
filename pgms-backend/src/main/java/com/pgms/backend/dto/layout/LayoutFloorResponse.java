package com.pgms.backend.dto.layout;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LayoutFloorResponse {
    private Integer floorNumber;
    private List<LayoutRoomResponse> rooms;
}
