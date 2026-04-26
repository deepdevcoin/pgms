package com.pgms.backend.service;

import com.pgms.backend.dto.complaint.ComplaintActivityResponse;
import com.pgms.backend.dto.complaint.ComplaintCommentRequest;
import com.pgms.backend.dto.complaint.ComplaintCreateRequest;
import com.pgms.backend.dto.complaint.ComplaintResponse;
import com.pgms.backend.dto.complaint.ComplaintStatusUpdateRequest;
import com.pgms.backend.entity.ComplaintActivity;
import com.pgms.backend.entity.Complaint;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.ComplaintActivityType;
import com.pgms.backend.entity.enums.ComplaintCategory;
import com.pgms.backend.entity.enums.ComplaintStatus;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ComplaintActivityRepository;
import com.pgms.backend.repository.ComplaintRepository;
import com.pgms.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintActivityRepository complaintActivityRepository;
    private final AccessControlService accessControlService;
    private final UserRepository userRepository;

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintActivityRepository complaintActivityRepository,
                            AccessControlService accessControlService,
                            UserRepository userRepository) {
        this.complaintRepository = complaintRepository;
        this.complaintActivityRepository = complaintActivityRepository;
        this.accessControlService = accessControlService;
        this.userRepository = userRepository;
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
        complaintActivityRepository.save(activityForCurrentUser(
                complaint,
                ComplaintActivityType.CREATED,
                null,
                ComplaintStatus.OPEN,
                request.getDescription()
        ));
        return toResponse(complaint);
    }

    public List<ComplaintResponse> getTenantComplaints() {
        return complaintRepository.findByTenantProfileUserIdOrderByCreatedAtDesc(accessControlService.getCurrentTenantProfile().getUser().getId())
                .stream().map(this::toResponse).toList();
    }

    public List<ComplaintActivityResponse> getTenantComplaintActivities(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        if (!complaint.getTenantProfile().getUser().getId().equals(accessControlService.getCurrentTenantProfile().getUser().getId())) {
            throw new BadRequestException("You can only access your own complaint history");
        }
        return activitiesForComplaint(complaint);
    }

    public List<ComplaintResponse> getManagerComplaints() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        return complaintRepository.findByTenantProfilePgIdInAndCategoryNotOrderByCreatedAtDesc(pgIds, ComplaintCategory.AGAINST_MANAGER)
                .stream().map(this::toResponse).toList();
    }

    public List<ComplaintActivityResponse> getManagerComplaintActivities(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        accessControlService.ensureManagerAssignedToPg(complaint.getTenantProfile().getPg().getId());
        if (complaint.getCategory() == ComplaintCategory.AGAINST_MANAGER) {
            throw new BadRequestException("Manager complaint history must be handled by owner");
        }
        return activitiesForComplaint(complaint);
    }

    public List<ComplaintResponse> getOwnerComplaints() {
        return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ComplaintActivityResponse> getOwnerComplaintActivities(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        return activitiesForComplaint(complaint);
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
    public ComplaintResponse commentAsTenant(Long id, ComplaintCommentRequest request) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        if (!complaint.getTenantProfile().getUser().getId().equals(accessControlService.getCurrentTenantProfile().getUser().getId())) {
            throw new BadRequestException("You can only add comments to your own complaint");
        }
        addCommentActivity(complaint, request.getMessage());
        return toResponse(complaintRepository.findById(id).orElseThrow());
    }

    @Transactional
    public ComplaintResponse commentAsManager(Long id, ComplaintCommentRequest request) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        accessControlService.ensureManagerAssignedToPg(complaint.getTenantProfile().getPg().getId());
        if (complaint.getCategory() == ComplaintCategory.AGAINST_MANAGER) {
            throw new BadRequestException("Manager complaint must be handled by owner");
        }
        addCommentActivity(complaint, request.getMessage());
        return toResponse(complaintRepository.findById(id).orElseThrow());
    }

    @Transactional
    public ComplaintResponse commentAsOwner(Long id, ComplaintCommentRequest request) {
        Complaint complaint = complaintRepository.findById(id).orElseThrow(() -> new NotFoundException("Complaint not found"));
        addCommentActivity(complaint, request.getMessage());
        return toResponse(complaintRepository.findById(id).orElseThrow());
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
        List<ComplaintActivity> activities = complaintActivityRepository.findByComplaintIdOrderByCreatedAtAsc(complaint.getId());
        ComplaintActivity latestActivity = activities.isEmpty() ? null : activities.get(activities.size() - 1);
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
                .latestActivitySummary(activitySummary(latestActivity, complaint))
                .activityCount(activities.size())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    private ComplaintResponse updateComplaint(Complaint complaint, ComplaintStatusUpdateRequest request) {
        validateStatusTransition(complaint, request.getStatus());
        ComplaintStatus previousStatus = complaint.getStatus();
        complaint.setStatus(request.getStatus());
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            complaint.setNotes(request.getNotes().trim());
        }
        complaint.setUpdatedAt(LocalDateTime.now());
        Complaint saved = complaintRepository.save(complaint);
        complaintActivityRepository.save(activityForCurrentUser(
                saved,
                ComplaintActivityType.STATUS_CHANGE,
                previousStatus,
                request.getStatus(),
                request.getNotes()
        ));
        return toResponse(saved);
    }

    private void validateStatusTransition(Complaint complaint, ComplaintStatus nextStatus) {
        if (complaint.getStatus() == ComplaintStatus.CLOSED && nextStatus != ComplaintStatus.CLOSED) {
            throw new BadRequestException("Closed complaints cannot be updated");
        }
        if (complaint.getCategory() == ComplaintCategory.AGAINST_MANAGER && nextStatus == ComplaintStatus.IN_PROGRESS) {
            return;
        }
    }

    private void addCommentActivity(Complaint complaint, String message) {
        if (message == null || message.isBlank()) {
            throw new BadRequestException("Comment is required");
        }
        complaint.setUpdatedAt(LocalDateTime.now());
        complaintRepository.save(complaint);
        complaintActivityRepository.save(activityForCurrentUser(
                complaint,
                ComplaintActivityType.COMMENT,
                null,
                complaint.getStatus(),
                message.trim()
        ));
    }

    private ComplaintActivity activityForCurrentUser(Complaint complaint,
                                                     ComplaintActivityType activityType,
                                                     ComplaintStatus fromStatus,
                                                     ComplaintStatus toStatus,
                                                     String message) {
        Long actorUserId = com.pgms.backend.util.SecurityUtils.getCurrentUserId();
        Role actorRole = com.pgms.backend.util.SecurityUtils.getCurrentUserRole();
        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(null) : null;
        return ComplaintActivity.builder()
                .complaint(complaint)
                .actorUserId(actorUserId)
                .actorName(actor != null ? actor.getName() : "System")
                .actorRole(actorRole != null ? actorRole : Role.OWNER)
                .activityType(activityType)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .message(message == null || message.isBlank() ? null : message.trim())
                .createdAt(LocalDateTime.now())
                .build();
    }

    private List<ComplaintActivityResponse> activitiesForComplaint(Complaint complaint) {
        List<ComplaintActivity> activities = complaintActivityRepository.findByComplaintIdOrderByCreatedAtAsc(complaint.getId());
        if (activities.isEmpty() && complaint.getNotes() != null && !complaint.getNotes().isBlank()) {
            return List.of(ComplaintActivityResponse.builder()
                    .id(-1L)
                    .activityType(ComplaintActivityType.COMMENT)
                    .actorRole(Role.OWNER)
                    .actorName("Legacy note")
                    .message(complaint.getNotes())
                    .createdAt(complaint.getUpdatedAt())
                    .build());
        }
        return activities.stream().map(this::toActivityResponse).toList();
    }

    private ComplaintActivityResponse toActivityResponse(ComplaintActivity activity) {
        return ComplaintActivityResponse.builder()
                .id(activity.getId())
                .activityType(activity.getActivityType())
                .actorRole(activity.getActorRole())
                .actorName(activity.getActorName())
                .fromStatus(activity.getFromStatus())
                .toStatus(activity.getToStatus())
                .message(activity.getMessage())
                .createdAt(activity.getCreatedAt())
                .build();
    }

    private String activitySummary(ComplaintActivity latestActivity, Complaint complaint) {
        if (latestActivity == null) {
            return complaint.getNotes() != null && !complaint.getNotes().isBlank() ? complaint.getNotes() : "";
        }
        if (latestActivity.getMessage() != null && !latestActivity.getMessage().isBlank()) {
            return latestActivity.getMessage();
        }
        if (latestActivity.getActivityType() == ComplaintActivityType.STATUS_CHANGE && latestActivity.getToStatus() != null) {
            return "Status moved to " + latestActivity.getToStatus();
        }
        return "";
    }
}
