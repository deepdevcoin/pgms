package com.pgms.backend.dto.analytics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ManagerSummaryResponse {
    private Double occupancyRate;
    private Integer totalRooms;
    private Integer occupiedRooms;
    private Double paymentCollectedThisMonth;
    private Double paymentPendingThisMonth;
    private Integer openComplaints;
    private Integer pendingServiceRequests;
    private List<ManagerVacateItemResponse> vacateNotices;
}
