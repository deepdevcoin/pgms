package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.vacate.VacateApprovalRequest;
import com.pgms.backend.dto.vacate.VacateNoticeResponse;
import com.pgms.backend.dto.vacate.VacateRequest;
import com.pgms.backend.service.VacateService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class VacateController {

    private final VacateService vacateService;

    public VacateController(VacateService vacateService) {
        this.vacateService = vacateService;
    }

    @PostMapping("/api/tenant/vacate")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<VacateNoticeResponse> createVacate(@Valid @RequestBody VacateRequest request) {
        return BaseResponse.success("Vacate notice created successfully", vacateService.createVacateRequest(request));
    }

    @GetMapping("/api/tenant/vacate")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<VacateNoticeResponse> getOwnVacate() {
        return BaseResponse.success("Vacate notice fetched successfully", vacateService.getCurrentTenantVacateNotice());
    }

    @GetMapping("/api/manager/vacate-notices")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<VacateNoticeResponse>> getManagerVacates() {
        return BaseResponse.success("Vacate notices fetched successfully", vacateService.getManagerVacateNotices());
    }

    @PutMapping("/api/manager/vacate-notices/{id}/approve-referral")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<VacateNoticeResponse> approveReferral(@PathVariable Long id, @Valid @RequestBody VacateApprovalRequest request) {
        return BaseResponse.success("Vacate referral processed successfully", vacateService.approveReferral(id, request.getApprove()));
    }

    @PutMapping("/api/manager/vacate-notices/{id}/checkout")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<VacateNoticeResponse> checkout(@PathVariable Long id) {
        return BaseResponse.success("Tenant checkout completed successfully", vacateService.checkout(id));
    }
}
