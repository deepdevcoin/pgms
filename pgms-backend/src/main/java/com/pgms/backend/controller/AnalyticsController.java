package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.analytics.ManagerSummaryResponse;
import com.pgms.backend.dto.analytics.OwnerSummaryResponse;
import com.pgms.backend.service.AnalyticsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/owner-summary")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<OwnerSummaryResponse> ownerSummary() {
        return BaseResponse.success("Owner analytics fetched successfully", analyticsService.ownerSummary());
    }

    @GetMapping("/manager-summary")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<ManagerSummaryResponse> managerSummary() {
        return BaseResponse.success("Manager analytics fetched successfully", analyticsService.managerSummary());
    }
}
