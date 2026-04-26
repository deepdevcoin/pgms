package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.complaint.ComplaintActivityResponse;
import com.pgms.backend.dto.complaint.ComplaintCommentRequest;
import com.pgms.backend.dto.complaint.ComplaintCreateRequest;
import com.pgms.backend.dto.complaint.ComplaintResponse;
import com.pgms.backend.dto.complaint.ComplaintStatusUpdateRequest;
import com.pgms.backend.service.ComplaintService;
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
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping("/api/tenant/complaints")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<ComplaintResponse> createComplaint(@Valid @RequestBody ComplaintCreateRequest request) {
        return BaseResponse.success("Complaint created successfully", complaintService.createComplaint(request));
    }

    @GetMapping("/api/tenant/complaints")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<ComplaintResponse>> tenantComplaints() {
        return BaseResponse.success("Complaints fetched successfully", complaintService.getTenantComplaints());
    }

    @GetMapping("/api/tenant/complaints/{id}/activities")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<ComplaintActivityResponse>> tenantComplaintActivities(@PathVariable Long id) {
        return BaseResponse.success("Complaint activity fetched successfully", complaintService.getTenantComplaintActivities(id));
    }

    @PostMapping("/api/tenant/complaints/{id}/comment")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<ComplaintResponse> tenantComment(@PathVariable Long id, @Valid @RequestBody ComplaintCommentRequest request) {
        return BaseResponse.success("Complaint comment added successfully", complaintService.commentAsTenant(id, request));
    }

    @GetMapping("/api/manager/complaints")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<ComplaintResponse>> managerComplaints() {
        return BaseResponse.success("Complaints fetched successfully", complaintService.getManagerComplaints());
    }

    @GetMapping("/api/manager/complaints/{id}/activities")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<ComplaintActivityResponse>> managerComplaintActivities(@PathVariable Long id) {
        return BaseResponse.success("Complaint activity fetched successfully", complaintService.getManagerComplaintActivities(id));
    }

    @PostMapping("/api/manager/complaints/{id}/comment")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<ComplaintResponse> managerComment(@PathVariable Long id, @Valid @RequestBody ComplaintCommentRequest request) {
        return BaseResponse.success("Complaint comment added successfully", complaintService.commentAsManager(id, request));
    }

    @PutMapping("/api/manager/complaints/{id}/update-status")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<ComplaintResponse> updateManagerComplaint(@PathVariable Long id,
                                                                  @Valid @RequestBody ComplaintStatusUpdateRequest request) {
        return BaseResponse.success("Complaint updated successfully", complaintService.updateByManager(id, request));
    }

    @GetMapping("/api/owner/complaints")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<ComplaintResponse>> ownerComplaints() {
        return BaseResponse.success("Complaints fetched successfully", complaintService.getOwnerComplaints());
    }

    @GetMapping("/api/owner/complaints/{id}/activities")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<ComplaintActivityResponse>> ownerComplaintActivities(@PathVariable Long id) {
        return BaseResponse.success("Complaint activity fetched successfully", complaintService.getOwnerComplaintActivities(id));
    }

    @PostMapping("/api/owner/complaints/{id}/comment")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<ComplaintResponse> ownerComment(@PathVariable Long id, @Valid @RequestBody ComplaintCommentRequest request) {
        return BaseResponse.success("Complaint comment added successfully", complaintService.commentAsOwner(id, request));
    }

    @PutMapping("/api/owner/complaints/{id}/update-status")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<ComplaintResponse> updateOwnerComplaint(@PathVariable Long id,
                                                                @Valid @RequestBody ComplaintStatusUpdateRequest request) {
        return BaseResponse.success("Complaint updated successfully", complaintService.updateByOwner(id, request));
    }
}
