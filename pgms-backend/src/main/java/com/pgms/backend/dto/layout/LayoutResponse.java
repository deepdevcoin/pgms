package com.pgms.backend.dto.layout;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LayoutResponse {
    private Long pgId;
    private String pgName;
    private List<LayoutFloorResponse> floors;
}
