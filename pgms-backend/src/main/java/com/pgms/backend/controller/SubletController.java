package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.payment.WalletResponse;
import com.pgms.backend.dto.sublet.SubletCompleteRequest;
import com.pgms.backend.dto.sublet.SubletCheckoutResponse;
import com.pgms.backend.dto.sublet.SubletCreateRequest;
import com.pgms.backend.dto.sublet.SubletResponse;
import com.pgms.backend.service.SubletService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SubletController {

    private final SubletService subletService;

    public SubletController(SubletService subletService) {
        this.subletService = subletService;
    }

    @PostMapping("/api/tenant/sublet")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<SubletResponse> create(@Valid @RequestBody SubletCreateRequest request) {
        return BaseResponse.success("Sublet request created successfully", subletService.createRequest(request));
    }

    @GetMapping("/api/tenant/sublet")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<SubletResponse>> tenantSublets() {
        return BaseResponse.success("Sublet requests fetched successfully", subletService.getTenantSublets());
    }

    @DeleteMapping("/api/tenant/sublet/{id}")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<Void> delete(@PathVariable Long id) {
        subletService.deletePendingRequest(id);
        return BaseResponse.success("Sublet request deleted successfully", null);
    }

    @GetMapping("/api/tenant/wallet")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<WalletResponse> wallet() {
        return BaseResponse.success("Wallet fetched successfully", subletService.getWallet());
    }

    @GetMapping("/api/manager/sublets")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<SubletResponse>> managerSublets() {
        return BaseResponse.success("Sublet requests fetched successfully", subletService.getManagerSublets());
    }

    @PutMapping("/api/manager/sublets/{id}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<SubletResponse> approve(@PathVariable Long id) {
        return BaseResponse.success("Sublet approved successfully", subletService.approve(id));
    }

    @PutMapping("/api/manager/sublets/{id}/unapprove")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<SubletResponse> unapprove(@PathVariable Long id) {
        return BaseResponse.success("Sublet moved back to pending successfully", subletService.unapprove(id));
    }

    @PutMapping("/api/manager/sublets/{id}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<SubletResponse> reject(@PathVariable Long id) {
        return BaseResponse.success("Sublet rejected successfully", subletService.reject(id));
    }

    @PutMapping("/api/manager/sublets/{id}/check-in")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<SubletResponse> checkIn(@PathVariable Long id, @Valid @RequestBody SubletCompleteRequest request) {
        return BaseResponse.success("Sublet guest checked in successfully", subletService.checkIn(id, request));
    }

    @PutMapping("/api/manager/sublets/{id}/checkout")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<SubletCheckoutResponse> checkout(@PathVariable Long id) {
        return BaseResponse.success("Sublet guest checked out successfully", subletService.checkout(id));
    }
}
