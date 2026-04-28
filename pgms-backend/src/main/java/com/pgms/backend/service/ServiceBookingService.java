package com.pgms.backend.service;

import com.pgms.backend.dto.service.ServiceBookingCreateRequest;
import com.pgms.backend.dto.service.ServiceBookingResponse;
import com.pgms.backend.dto.service.ServiceRatingRequest;
import com.pgms.backend.dto.service.ServiceStatusUpdateRequest;
import com.pgms.backend.entity.ServiceBooking;
import com.pgms.backend.entity.enums.ServiceStatus;
import com.pgms.backend.entity.enums.ServiceType;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ServiceBookingRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class ServiceBookingService {
    private static final List<ServiceStatus> ACTIVE_STATUSES = List.of(
            ServiceStatus.REQUESTED,
            ServiceStatus.CONFIRMED,
            ServiceStatus.IN_PROGRESS
    );

    private final ServiceBookingRepository serviceBookingRepository;
    private final AccessControlService accessControlService;

    public ServiceBookingService(ServiceBookingRepository serviceBookingRepository, AccessControlService accessControlService) {
        this.serviceBookingRepository = serviceBookingRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public ServiceBookingResponse create(ServiceBookingCreateRequest request) {
        validatePreferredDate(request.getPreferredDate());
        String preferredTimeWindow = normalizeOptionalText(request.getPreferredTimeWindow());
        String requestNotes = normalizeOptionalText(request.getRequestNotes());
        ensureNoDuplicateActiveRequest(
                accessControlService.getCurrentTenantProfile().getId(),
                request.getServiceType(),
                request.getPreferredDate(),
                preferredTimeWindow
        );
        LocalDateTime now = LocalDateTime.now();
        ServiceBooking booking = serviceBookingRepository.save(ServiceBooking.builder()
                .tenantProfile(accessControlService.getCurrentTenantProfile())
                .serviceType(request.getServiceType())
                .preferredDate(request.getPreferredDate())
                .preferredTimeWindow(preferredTimeWindow)
                .requestNotes(requestNotes)
                .status(ServiceStatus.REQUESTED)
                .createdAt(now)
                .updatedAt(now)
                .build());
        return toResponse(booking);
    }

    public List<ServiceBookingResponse> getTenantBookings() {
        return serviceBookingRepository.findByTenantProfileUserIdOrderByCreatedAtDesc(accessControlService.getCurrentTenantProfile().getUser().getId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ServiceBookingResponse rate(Long id, ServiceRatingRequest request) {
        ServiceBooking booking = serviceBookingRepository.findById(id).orElseThrow(() -> new NotFoundException("Service booking not found"));
        if (!booking.getTenantProfile().getId().equals(accessControlService.getCurrentTenantProfile().getId())) {
            throw new BadRequestException("Service booking does not belong to current tenant");
        }
        if (booking.getStatus() != ServiceStatus.COMPLETED) {
            throw new BadRequestException("Only completed services can be rated");
        }
        if (booking.getRating() != null) {
            throw new BadRequestException("Service booking has already been rated");
        }
        booking.setRating(request.getRating());
        booking.setRatingComment(normalizeOptionalText(request.getRatingComment()));
        booking.setUpdatedAt(LocalDateTime.now());
        return toResponse(serviceBookingRepository.save(booking));
    }

    public List<ServiceBookingResponse> getManagerBookings() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        return serviceBookingRepository.findByTenantProfilePgIdInOrderByCreatedAtDesc(pgIds).stream().map(this::toResponse).toList();
    }

    public List<ServiceBookingResponse> getOwnerBookings() {
        return serviceBookingRepository.findAll().stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ServiceBookingResponse updateStatus(Long id, ServiceStatusUpdateRequest request) {
        ServiceBooking booking = serviceBookingRepository.findById(id).orElseThrow(() -> new NotFoundException("Service booking not found"));
        accessControlService.ensureManagerAssignedToPg(booking.getTenantProfile().getPg().getId());
        return updateStatusInternal(booking, request);
    }

    @Transactional
    public ServiceBookingResponse updateStatusForOwner(Long id, ServiceStatusUpdateRequest request) {
        ServiceBooking booking = serviceBookingRepository.findById(id).orElseThrow(() -> new NotFoundException("Service booking not found"));
        return updateStatusInternal(booking, request, false);
    }

    private ServiceBookingResponse updateStatusInternal(ServiceBooking booking, ServiceStatusUpdateRequest request) {
        return updateStatusInternal(booking, request, true);
    }

    private ServiceBookingResponse updateStatusInternal(ServiceBooking booking,
                                                        ServiceStatusUpdateRequest request,
                                                        boolean requireClosureNotes) {
        ServiceStatus nextStatus = request.getStatus();
        validateTransition(booking.getStatus(), nextStatus);
        String managerNotes = normalizeOptionalText(request.getNotes());
        LocalDateTime now = LocalDateTime.now();
        booking.setStatus(nextStatus);
        if (managerNotes != null) {
            booking.setManagerNotes(managerNotes);
        }
        booking.setUpdatedAt(now);
        switch (nextStatus) {
            case CONFIRMED -> booking.setConfirmedAt(now);
            case IN_PROGRESS -> booking.setStartedAt(now);
            case COMPLETED -> booking.setCompletedAt(now);
            case REJECTED -> booking.setRejectedAt(now);
            default -> { }
        }
        return toResponse(serviceBookingRepository.save(booking));
    }

    public ServiceBookingResponse toResponse(ServiceBooking booking) {
        return ServiceBookingResponse.builder()
                .id(booking.getId())
                .tenantProfileId(booking.getTenantProfile().getId())
                .tenantName(booking.getTenantProfile().getUser().getName())
                .pgId(booking.getTenantProfile().getPg().getId())
                .pgName(booking.getTenantProfile().getPg().getName())
                .roomNumber(booking.getTenantProfile().getRoom().getRoomNumber())
                .serviceType(booking.getServiceType())
                .preferredDate(booking.getPreferredDate())
                .preferredTimeWindow(booking.getPreferredTimeWindow())
                .requestNotes(booking.getRequestNotes())
                .status(booking.getStatus())
                .managerNotes(booking.getManagerNotes())
                .rating(booking.getRating())
                .ratingComment(booking.getRatingComment())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .confirmedAt(booking.getConfirmedAt())
                .startedAt(booking.getStartedAt())
                .completedAt(booking.getCompletedAt())
                .rejectedAt(booking.getRejectedAt())
                .build();
    }

    private void validatePreferredDate(LocalDate preferredDate) {
        if (preferredDate == null) {
            throw new BadRequestException("Preferred date is required");
        }
        if (preferredDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Preferred date cannot be in the past");
        }
    }

    private void ensureNoDuplicateActiveRequest(Long tenantProfileId,
                                                ServiceType serviceType,
                                                LocalDate preferredDate,
                                                String preferredTimeWindow) {
        boolean duplicateExists = serviceBookingRepository
                .findByTenantProfileIdAndStatusInOrderByCreatedAtDesc(tenantProfileId, ACTIVE_STATUSES)
                .stream()
                .anyMatch(booking ->
                        booking.getServiceType() == serviceType
                                && Objects.equals(booking.getPreferredDate(), preferredDate)
                                && Objects.equals(normalizeOptionalText(booking.getPreferredTimeWindow()), preferredTimeWindow)
                );
        if (duplicateExists) {
            throw new BadRequestException("An active request already exists for this service and time window");
        }
    }

    private void validateTransition(ServiceStatus currentStatus, ServiceStatus nextStatus) {
        if (currentStatus == nextStatus) {
            throw new BadRequestException("Service request is already in this status");
        }
        boolean valid = switch (currentStatus) {
            case REQUESTED -> nextStatus == ServiceStatus.CONFIRMED || nextStatus == ServiceStatus.REJECTED;
            case CONFIRMED -> nextStatus == ServiceStatus.IN_PROGRESS || nextStatus == ServiceStatus.REJECTED;
            case IN_PROGRESS -> nextStatus == ServiceStatus.COMPLETED;
            case COMPLETED, REJECTED -> false;
        };
        if (!valid) {
            throw new BadRequestException("Invalid service status transition");
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
