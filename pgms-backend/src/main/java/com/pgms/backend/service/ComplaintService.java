package com.pgms.backend.service;

import com.pgms.backend.dto.complaint.ComplaintCreateRequest;
import com.pgms.backend.dto.complaint.ComplaintResponse;
import com.pgms.backend.dto.complaint.ComplaintStatusUpdateRequest;
import com.pgms.backend.entity.Complaint;
import com.pgms.backend.entity.enums.ComplaintCategory;
import com.pgms.backend.entity.enums.ComplaintStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ComplaintRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final AccessControlService accessControlService;

    public ComplaintService(ComplaintRepository complaintRepository, AccessControlService accessControlService) {
        this.complaintRepository = complaintRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public ComplaintResponse createComplaint(ComplaintCreateRequest request) {
        Complaint complaint = complaintRepository.save(Complaint.builder()
                .tenantProfile(accessControlService.getCurrentTenantProfile())
                .category(request.getCategory())
                .description(request.getDescription())
                .attachmentPath(request.getAttachmentPath())
                .status(ComplaintStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
        return toResponse(complaint);
    }

    public List<ComplaintResponse> getTenantComplaints() {
        return complaintRepository.findByTenantProfileUserIdOrderByCreatedAtDesc(accessControlService.getCurrentTenantProfile().getUser().getId())
                .stream().map(this::toResponse).toList();
    }

    public List<ComplaintResponse> getManagerComplaints() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return complaintRepository.findByTenantProfilePgIdAndCategoryNotOrderByCreatedAtDesc(pgId, ComplaintCategory.AGAINST_MANAGER)
                .stream().map(this::toResponse).toList();
    }

    public List<ComplaintResponse> getOwnerComplaints() {
        return complaintRepository.findAll().stream()
                .filter(complaint -> complaint.getStatus() == ComplaintStatus.ESCALATED || complaint.getCategory() == ComplaintCategory.AGAINST_MANAGER)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ComplaintResponse updateByManager(Long id, ComplaintStatusUpdateRequest request) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        accessControlService.ensureManagerAssignedToPg(complaint.getTenantProfile().getPg().getId());
        if (complaint.getCategory() == ComplaintCategory.AGAINST_MANAGER) {
            throw new BadRequestException("Manager complaint must be handled by owner");
        }
        return updateComplaint(complaint, request);
    }

    @Transactional
    public ComplaintResponse updateByOwner(Long id, ComplaintStatusUpdateRequest request) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        return updateComplaint(complaint, request);
    }

    @Transactional
    @Scheduled(cron = "0 0 1 * * *")
    public void escalateComplaints() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(96);
        List<Complaint> complaints = complaintRepository.findByStatusInAndUpdatedAtBefore(
                List.of(ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS), threshold);
        for (Complaint complaint : complaints) {
            complaint.setStatus(ComplaintStatus.ESCALATED);
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
        }
    }

    public ComplaintResponse toResponse(Complaint complaint) {
        return ComplaintResponse.builder()
                .id(complaint.getId())
                .tenantProfileId(complaint.getTenantProfile().getId())
                .tenantName(complaint.getTenantProfile().getUser().getName())
                .roomNumber(complaint.getTenantProfile().getRoom().getRoomNumber())
                .category(complaint.getCategory())
                .description(complaint.getDescription())
                .attachmentPath(complaint.getAttachmentPath())
                .status(complaint.getStatus())
                .notes(complaint.getNotes())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    private ComplaintResponse updateComplaint(Complaint complaint, ComplaintStatusUpdateRequest request) {
        complaint.setStatus(request.getStatus());
        complaint.setNotes(request.getNotes());
        complaint.setUpdatedAt(LocalDateTime.now());
        return toResponse(complaintRepository.save(complaint));
    }
}
