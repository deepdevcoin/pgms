package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.amenity.AmenityBookingRequest;
import com.pgms.backend.dto.amenity.AmenityBookingResponse;
import com.pgms.backend.dto.amenity.AmenitySlotCreateRequest;
import com.pgms.backend.dto.amenity.AmenitySlotUpdateRequest;
import com.pgms.backend.service.AmenityService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AmenityController {

    private final AmenityService amenityService;

    public AmenityController(AmenityService amenityService) {
        this.amenityService = amenityService;
    }

    @PostMapping("/api/manager/amenities/slots")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<AmenityBookingResponse> createSlot(@Valid @RequestBody AmenitySlotCreateRequest request) {
        return BaseResponse.success("Amenity slot created successfully", amenityService.createSlot(request));
    }

    @GetMapping({"/api/manager/amenities/slots", "/api/manager/amenities/bookings"})
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<AmenityBookingResponse>> managerBookings() {
        return BaseResponse.success("Amenity slots fetched successfully", amenityService.getManagerSlots());
    }

    @DeleteMapping("/api/manager/amenities/slots/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<Void> deleteSlot(@PathVariable Long id) {
        amenityService.deleteSlot(id);
        return BaseResponse.success("Amenity slot deleted successfully", null);
    }

    @PutMapping("/api/manager/amenities/slots/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<AmenityBookingResponse> updateSlot(@PathVariable Long id, @Valid @RequestBody AmenitySlotUpdateRequest request) {
        return BaseResponse.success("Amenity slot updated successfully", amenityService.updateSlot(id, request));
    }

    @GetMapping("/api/tenant/amenities/slots")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<AmenityBookingResponse>> tenantSlots() {
        return BaseResponse.success("Amenity slots fetched successfully", amenityService.getTenantAvailableSlots());
    }

    @PostMapping("/api/tenant/amenities/book")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<AmenityBookingResponse> book(@Valid @RequestBody AmenityBookingRequest request) {
        return BaseResponse.success("Amenity booked successfully", amenityService.bookSlot(request));
    }

    @DeleteMapping("/api/tenant/amenities/bookings/{id}")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<Void> cancel(@PathVariable Long id) {
        amenityService.cancelBooking(id);
        return BaseResponse.success("Amenity booking cancelled successfully", null);
    }

    @GetMapping("/api/tenant/amenities/open-invites")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<AmenityBookingResponse>> openInvites() {
        return BaseResponse.success("Open invites fetched successfully", amenityService.getOpenInvites());
    }

    @PostMapping("/api/tenant/amenities/join/{slotId}")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<AmenityBookingResponse> join(@PathVariable Long slotId) {
        return BaseResponse.success("Joined open invite successfully", amenityService.joinOpenInvite(slotId));
    }
}
