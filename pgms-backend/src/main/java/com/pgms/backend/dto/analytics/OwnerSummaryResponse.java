package com.pgms.backend.dto.analytics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OwnerSummaryResponse {
    private Integer totalPgs;
    private Integer totalRooms;
    private Integer totalVacantRooms;
    private Integer totalActiveTenants;
    private Integer totalVacatingTenants;
    private Double totalRentCollectedThisMonth;
    private Double totalRentPendingThisMonth;
    private Double totalFinesOutstanding;
    private Integer openComplaints;
    private Integer escalatedComplaints;
    private Integer managerComplaints;
    private List<AdvanceRefundItemResponse> advanceRefundQueue;
}
