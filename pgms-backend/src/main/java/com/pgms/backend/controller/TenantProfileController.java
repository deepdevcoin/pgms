package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.tenant.TenantProfileUpdateRequest;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.service.TenantService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tenant/profile")
@PreAuthorize("hasRole('TENANT')")
public class TenantProfileController {

    private final TenantService tenantService;

    public TenantProfileController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping
    public BaseResponse<TenantResponse> getProfile() {
        return BaseResponse.success("Tenant profile fetched successfully", tenantService.getCurrentTenantProfile());
    }

    @PutMapping
    public BaseResponse<TenantResponse> updateProfile(@RequestBody TenantProfileUpdateRequest request) {
        return BaseResponse.success("Tenant profile updated successfully", tenantService.updateCurrentTenantProfile(request));
    }
}
