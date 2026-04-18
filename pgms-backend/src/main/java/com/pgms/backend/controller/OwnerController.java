package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.pg.PgSummaryResponse;
import com.pgms.backend.dto.pg.RoomResponse;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.service.PgService;
import com.pgms.backend.service.TenantService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/owner")
public class OwnerController {

    private final PgService pgService;
    private final TenantService tenantService;

    public OwnerController(PgService pgService, TenantService tenantService) {
        this.pgService = pgService;
        this.tenantService = tenantService;
    }

    @GetMapping("/pgs")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<PgSummaryResponse>> getPgs() {
        return BaseResponse.success("PGs fetched successfully", pgService.getAllPgsWithSummary());
    }

    @GetMapping("/pgs/{pgId}/rooms")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<RoomResponse>> getRooms(@PathVariable Long pgId,
                                                     @RequestParam(required = false) RoomStatus status,
                                                     @RequestParam(required = false) Integer floor) {
        return BaseResponse.success("Rooms fetched successfully", pgService.getRoomsByPgId(pgId, status, floor));
    }

    @GetMapping("/tenants")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<TenantResponse>> getTenants() {
        return BaseResponse.success("Tenants fetched successfully", tenantService.getAllTenants());
    }
}
