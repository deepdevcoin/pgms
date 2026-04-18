package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.manager.ManagerCreateRequest;
import com.pgms.backend.dto.manager.ManagerResponse;
import com.pgms.backend.dto.manager.PgAssignRequest;
import com.pgms.backend.service.ManagerService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/owner/managers")
@PreAuthorize("hasRole('OWNER')")
public class OwnerManagerController {

    private final ManagerService managerService;

    public OwnerManagerController(ManagerService managerService) {
        this.managerService = managerService;
    }

    @GetMapping
    public BaseResponse<List<ManagerResponse>> getManagers() {
        return BaseResponse.success("Managers fetched successfully", managerService.getAllManagers());
    }

    @PostMapping
    public BaseResponse<ManagerResponse> createManager(@Valid @RequestBody ManagerCreateRequest request) {
        return BaseResponse.success("Manager created successfully", managerService.createManager(request));
    }

    @PutMapping("/{id}/assign")
    public BaseResponse<ManagerResponse> assignPgs(@PathVariable Long id, @Valid @RequestBody PgAssignRequest request) {
        return BaseResponse.success("Manager PGs assigned successfully", managerService.assignPgs(id, request.getPgIds()));
    }

    @PutMapping("/{id}/deactivate")
    public BaseResponse<Void> deactivate(@PathVariable Long id) {
        managerService.deactivateManager(id);
        return BaseResponse.success("Manager deactivated successfully", null);
    }

    @PutMapping("/{id}/activate")
    public BaseResponse<Void> activate(@PathVariable Long id) {
        managerService.activateManager(id);
        return BaseResponse.success("Manager activated successfully", null);
    }

    @DeleteMapping("/{id}")
    public BaseResponse<Void> delete(@PathVariable Long id) {
        managerService.deleteManagerPermanently(id);
        return BaseResponse.success("Manager deleted permanently", null);
    }
}
