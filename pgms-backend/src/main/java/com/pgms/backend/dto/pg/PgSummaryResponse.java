package com.pgms.backend.dto.pg;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PgSummaryResponse {
    private Long id;
    private String name;
    private String address;
    private Integer totalFloors;
    private Integer paymentDeadlineDay;
    private Integer fineAmountPerDay;
    private Integer slaHours;
    private Integer vacantCount;
    private Integer occupiedCount;
    private Integer vacatingCount;
}
