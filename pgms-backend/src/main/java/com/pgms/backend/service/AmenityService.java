package com.pgms.backend.service;

import com.pgms.backend.dto.amenity.AmenityBookingRequest;
import com.pgms.backend.dto.amenity.AmenityBookingResponse;
import com.pgms.backend.dto.amenity.AmenitySlotCreateRequest;
import com.pgms.backend.entity.AmenityBooking;
import com.pgms.backend.entity.AmenitySlot;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.enums.BookingStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.ConflictException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.AmenityBookingRepository;
import com.pgms.backend.repository.AmenitySlotRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AmenityService {

    private final AmenitySlotRepository amenitySlotRepository;
    private final AmenityBookingRepository amenityBookingRepository;
    private final AccessControlService accessControlService;
    private final PgService pgService;

    public AmenityService(AmenitySlotRepository amenitySlotRepository,
                          AmenityBookingRepository amenityBookingRepository,
                          AccessControlService accessControlService,
                          PgService pgService) {
        this.amenitySlotRepository = amenitySlotRepository;
        this.amenityBookingRepository = amenityBookingRepository;
        this.accessControlService = accessControlService;
        this.pgService = pgService;
    }

    @Transactional
    public AmenityBookingResponse createSlot(AmenitySlotCreateRequest request) {
        accessControlService.ensureManagerAssignedToPg(request.getPgId());
        Pg pg = pgService.getPgOrThrow(request.getPgId());
        AmenitySlot slot = amenitySlotRepository.save(AmenitySlot.builder()
                .pg(pg)
                .amenityType(request.getAmenityType())
                .slotDate(request.getSlotDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .capacity(request.getCapacity())
                .facilityName(request.getFacilityName())
                .build());
        return toResponse(slot, null);
    }

    public List<AmenityBookingResponse> getManagerBookings() {
        return accessControlService.getAssignedPgIdsForCurrentManager().stream()
                .flatMap(pgId -> amenityBookingRepository.findBySlotPgIdOrderByCreatedAtDesc(pgId).stream())
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    public List<AmenityBookingResponse> getTenantAvailableSlots() {
        var tenantProfile = accessControlService.getCurrentTenantProfile();
        Long pgId = tenantProfile.getPg().getId();
        return amenitySlotRepository.findByPgIdOrderBySlotDateAscStartTimeAsc(pgId).stream()
                .filter(slot -> !slot.getSlotDate().isBefore(LocalDate.now()))
                .map(slot -> toResponse(slot, amenityBookingRepository
                        .findBySlotIdAndTenantProfileIdAndStatus(slot.getId(), tenantProfile.getId(), BookingStatus.CONFIRMED)
                        .orElse(null)))
                .toList();
    }

    @Transactional
    public AmenityBookingResponse bookSlot(AmenityBookingRequest request) {
        AmenitySlot slot = amenitySlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        if (!slot.getPg().getId().equals(accessControlService.getCurrentTenantProfile().getPg().getId())) {
            throw new BadRequestException("Slot does not belong to tenant's PG");
        }
        if (amenityBookingRepository.findBySlotIdAndTenantProfileIdAndStatus(
                slot.getId(),
                accessControlService.getCurrentTenantProfile().getId(),
                BookingStatus.CONFIRMED
        ).isPresent()) {
            throw new ConflictException("You already have a booking for this slot");
        }
        long count = amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED);
        if (count >= slot.getCapacity()) {
            throw new ConflictException("Slot is full");
        }
        AmenityBooking booking = amenityBookingRepository.save(AmenityBooking.builder()
                .slot(slot)
                .tenantProfile(accessControlService.getCurrentTenantProfile())
                .status(BookingStatus.CONFIRMED)
                .openInvite(request.getIsOpenInvite())
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(booking);
    }

    @Transactional
    public void cancelBooking(Long bookingId) {
        AmenityBooking booking = amenityBookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        if (!booking.getTenantProfile().getId().equals(accessControlService.getCurrentTenantProfile().getId())) {
            throw new BadRequestException("Booking does not belong to current tenant");
        }
        LocalDateTime slotStart = LocalDateTime.of(booking.getSlot().getSlotDate(), booking.getSlot().getStartTime());
        if (slotStart.minusHours(1).isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Booking can only be cancelled more than one hour before start");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        amenityBookingRepository.save(booking);
    }

    public List<AmenityBookingResponse> getOpenInvites() {
        return amenityBookingRepository.findByOpenInviteTrueAndStatusOrderByCreatedAtDesc(BookingStatus.CONFIRMED)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public AmenityBookingResponse joinOpenInvite(Long slotId) {
        return bookSlot(new AmenityBookingRequest() {{
            setSlotId(slotId);
            setIsOpenInvite(false);
        }});
    }

    private AmenityBookingResponse toResponse(AmenityBooking booking) {
        return toResponse(booking.getSlot(), booking);
    }

    private AmenityBookingResponse toResponse(AmenitySlot slot, AmenityBooking booking) {
        long bookingCount = amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED);
        return AmenityBookingResponse.builder()
                .bookingId(booking != null ? booking.getId() : null)
                .slotId(slot.getId())
                .pgId(slot.getPg().getId())
                .tenantName(booking != null ? booking.getTenantProfile().getUser().getName() : null)
                .amenityType(slot.getAmenityType())
                .facilityName(slot.getFacilityName())
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .capacity(slot.getCapacity())
                .bookingCount(bookingCount)
                .openInvite(booking != null && Boolean.TRUE.equals(booking.getOpenInvite()))
                .status(booking != null ? booking.getStatus() : null)
                .build();
    }
}
