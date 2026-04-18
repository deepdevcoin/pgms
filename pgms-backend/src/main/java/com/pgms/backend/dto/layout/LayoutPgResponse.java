package com.pgms.backend.dto.layout;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LayoutPgResponse {
    private Long id;
    private String name;
    private String address;
    private Integer totalFloors;
}
