package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.service.ServiceBookingCreateRequest;
import com.pgms.backend.dto.service.ServiceBookingResponse;
import com.pgms.backend.dto.service.ServiceRatingRequest;
import com.pgms.backend.dto.service.ServiceStatusUpdateRequest;
import com.pgms.backend.service.ServiceBookingService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ServiceBookingController {

    private final ServiceBookingService serviceBookingService;

    public ServiceBookingController(ServiceBookingService serviceBookingService) {
        this.serviceBookingService = serviceBookingService;
    }

    @PostMapping("/api/tenant/services")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<ServiceBookingResponse> create(@Valid @RequestBody ServiceBookingCreateRequest request) {
        return BaseResponse.success("Service booking created successfully", serviceBookingService.create(request));
    }

    @GetMapping("/api/tenant/services")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<ServiceBookingResponse>> tenantServices() {
        return BaseResponse.success("Service bookings fetched successfully", serviceBookingService.getTenantBookings());
    }

    @PostMapping("/api/tenant/services/{id}/rate")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<ServiceBookingResponse> rate(@PathVariable Long id, @Valid @RequestBody ServiceRatingRequest request) {
        return BaseResponse.success("Service rating submitted successfully", serviceBookingService.rate(id, request));
    }

    @GetMapping("/api/manager/services")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<ServiceBookingResponse>> managerServices() {
        return BaseResponse.success("Service bookings fetched successfully", serviceBookingService.getManagerBookings());
    }

    @PutMapping("/api/manager/services/{id}/update-status")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<ServiceBookingResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody ServiceStatusUpdateRequest request) {
        return BaseResponse.success("Service booking updated successfully", serviceBookingService.updateStatus(id, request));
    }
}
