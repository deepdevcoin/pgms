package com.pgms.backend.service;

import com.pgms.backend.dto.service.ServiceBookingCreateRequest;
import com.pgms.backend.dto.service.ServiceBookingResponse;
import com.pgms.backend.dto.service.ServiceRatingRequest;
import com.pgms.backend.dto.service.ServiceStatusUpdateRequest;
import com.pgms.backend.entity.ServiceBooking;
import com.pgms.backend.entity.enums.ServiceStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ServiceBookingRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServiceBookingService {

    private final ServiceBookingRepository serviceBookingRepository;
    private final AccessControlService accessControlService;

    public ServiceBookingService(ServiceBookingRepository serviceBookingRepository, AccessControlService accessControlService) {
        this.serviceBookingRepository = serviceBookingRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public ServiceBookingResponse create(ServiceBookingCreateRequest request) {
        ServiceBooking booking = serviceBookingRepository.save(ServiceBooking.builder()
                .tenantProfile(accessControlService.getCurrentTenantProfile())
                .serviceType(request.getServiceType())
                .preferredDate(request.getPreferredDate())
                .preferredTimeWindow(request.getPreferredTimeWindow())
                .status(ServiceStatus.REQUESTED)
                .createdAt(LocalDateTime.now())
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
        booking.setRating(request.getRating());
        booking.setRatingComment(request.getRatingComment());
        return toResponse(serviceBookingRepository.save(booking));
    }

    public List<ServiceBookingResponse> getManagerBookings() {
        Long pgId = accessControlService.getPrimaryPgIdForCurrentManager();
        return serviceBookingRepository.findByTenantProfilePgIdOrderByCreatedAtDesc(pgId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ServiceBookingResponse updateStatus(Long id, ServiceStatusUpdateRequest request) {
        ServiceBooking booking = serviceBookingRepository.findById(id).orElseThrow(() -> new NotFoundException("Service booking not found"));
        accessControlService.ensureManagerAssignedToPg(booking.getTenantProfile().getPg().getId());
        booking.setStatus(request.getStatus());
        booking.setNotes(request.getNotes());
        return toResponse(serviceBookingRepository.save(booking));
    }

    public ServiceBookingResponse toResponse(ServiceBooking booking) {
        return ServiceBookingResponse.builder()
                .id(booking.getId())
                .tenantProfileId(booking.getTenantProfile().getId())
                .tenantName(booking.getTenantProfile().getUser().getName())
                .roomNumber(booking.getTenantProfile().getRoom().getRoomNumber())
                .serviceType(booking.getServiceType())
                .preferredDate(booking.getPreferredDate())
                .preferredTimeWindow(booking.getPreferredTimeWindow())
                .status(booking.getStatus())
                .notes(booking.getNotes())
                .rating(booking.getRating())
                .ratingComment(booking.getRatingComment())
                .build();
    }
}
