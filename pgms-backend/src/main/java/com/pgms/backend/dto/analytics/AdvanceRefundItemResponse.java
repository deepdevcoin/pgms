package com.pgms.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdvanceRefundItemResponse {
    private String tenantName;
    private String roomNumber;
    private Double advanceRefundAmount;
}
