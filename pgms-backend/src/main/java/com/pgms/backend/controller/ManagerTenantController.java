package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.tenant.TenantCreateRequest;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/manager/tenants")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerTenantController {

    private final TenantService tenantService;

    public ManagerTenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    public BaseResponse<TenantResponse> createTenant(@Valid @RequestBody TenantCreateRequest request) {
        return BaseResponse.success("Tenant created successfully", tenantService.createTenant(request));
    }

    @GetMapping
    public BaseResponse<List<TenantResponse>> getTenants() {
        return BaseResponse.success("Tenants fetched successfully", tenantService.getTenantsForCurrentManager());
    }
}
