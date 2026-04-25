package com.pgms.backend.service;

import com.pgms.backend.dto.amenity.AmenityBookingRequest;
import com.pgms.backend.dto.amenity.AmenityBookingResponse;
import com.pgms.backend.dto.amenity.AmenitySlotCreateRequest;
import com.pgms.backend.dto.amenity.AmenitySlotUpdateRequest;
import com.pgms.backend.entity.AmenityBooking;
import com.pgms.backend.entity.AmenitySlot;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.enums.AmenityType;
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
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
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
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        int requestedCapacity = requestedCapacity(request.getCapacity());
        String location = normalizedLocation(request.getAmenityType(), request.getFacilityName());
        String resourceLabel = normalizedResourceLabel(request.getAmenityType(), request.getResourceName());

        List<AmenitySlot> slots = new ArrayList<>();
        LocalTime cursor = request.getStartTime();
        while (cursor.isBefore(request.getEndTime())) {
            LocalTime next = cursor.plusMinutes(30);
            if (next.isAfter(request.getEndTime())) {
                next = request.getEndTime();
            }
            if (request.getAmenityType() == AmenityType.WASHING_MACHINE) {
                for (int unit = 1; unit <= requestedCapacity; unit++) {
                    slots.add(AmenitySlot.builder()
                            .pg(pg)
                            .amenityType(request.getAmenityType())
                            .slotDate(request.getSlotDate())
                            .startTime(cursor)
                            .endTime(next)
                            .capacity(1)
                            .facilityName(location)
                            .resourceName(resourceLabel + " " + unit)
                            .build());
                }
            } else {
                slots.add(AmenitySlot.builder()
                        .pg(pg)
                        .amenityType(request.getAmenityType())
                        .slotDate(request.getSlotDate())
                        .startTime(cursor)
                        .endTime(next)
                        .capacity(requestedCapacity)
                        .facilityName(location)
                        .resourceName(resourceLabel)
                        .build());
            }
            cursor = next;
        }

        List<AmenitySlot> savedSlots = amenitySlotRepository.saveAll(slots);
        return toResponse(savedSlots.get(0), null, null);
    }

    public List<AmenityBookingResponse> getManagerSlots() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        return amenitySlotRepository.findByPgIdInOrderBySlotDateAscStartTimeAsc(pgIds).stream()
                .filter(slot -> !slot.getSlotDate().isBefore(LocalDate.now()))
                .sorted(Comparator
                        .comparing(AmenitySlot::getSlotDate)
                        .thenComparing(AmenitySlot::getStartTime)
                        .thenComparing(slot -> slot.getFacilityName() == null ? "" : slot.getFacilityName())
                        .thenComparing(slot -> slot.getResourceName() == null ? "" : slot.getResourceName()))
                .map(this::toManagerResponse)
                .toList();
    }

    public List<AmenityBookingResponse> getTenantAvailableSlots() {
        var tenantProfile = accessControlService.getCurrentTenantProfile();
        Long pgId = tenantProfile.getPg().getId();
        return amenitySlotRepository.findByPgIdOrderBySlotDateAscStartTimeAsc(pgId).stream()
                .filter(slot -> !slot.getSlotDate().isBefore(LocalDate.now()))
                .map(slot -> {
                    AmenityBooking ownBooking = amenityBookingRepository
                            .findBySlotIdAndTenantProfileIdAndStatus(slot.getId(), tenantProfile.getId(), BookingStatus.CONFIRMED)
                            .orElse(null);
                    AmenityBooking hostBooking = ownBooking == null
                            ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED)
                                .filter(booking -> !booking.getTenantProfile().getId().equals(tenantProfile.getId()))
                                .orElse(null)
                            : null;
                    return toResponse(slot, ownBooking, hostBooking);
                })
                .toList();
    }

    @Transactional
    public AmenityBookingResponse bookSlot(AmenityBookingRequest request) {
        AmenitySlot slot = amenitySlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        var tenantProfile = accessControlService.getCurrentTenantProfile();
        if (!slot.getPg().getId().equals(tenantProfile.getPg().getId())) {
            throw new BadRequestException("Slot does not belong to tenant's PG");
        }
        if (amenityBookingRepository.findBySlotIdAndTenantProfileIdAndStatus(
                slot.getId(),
                tenantProfile.getId(),
                BookingStatus.CONFIRMED
        ).isPresent()) {
            throw new ConflictException("You already have a booking for this slot");
        }
        ensureNoOverlappingBooking(slot, tenantProfile.getId());
        long count = amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED);
        int effectiveCapacity = normalizedCapacity(slot.getAmenityType(), slot.getCapacity());
        if (count >= effectiveCapacity) {
            throw new ConflictException("Slot is full");
        }
        if (Boolean.TRUE.equals(request.getIsOpenInvite()) && !isShareable(slot.getAmenityType())) {
            throw new BadRequestException("Open invite is only available for shared amenities");
        }
        AmenityBooking booking = amenityBookingRepository.save(AmenityBooking.builder()
                .slot(slot)
                .tenantProfile(tenantProfile)
                .status(BookingStatus.CONFIRMED)
                .openInvite(request.getIsOpenInvite())
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(booking);
    }

    @Transactional
    public AmenityBookingResponse updateSlot(Long slotId, AmenitySlotUpdateRequest request) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        accessControlService.ensureManagerAssignedToPg(slot.getPg().getId());
        accessControlService.ensureManagerAssignedToPg(request.getPgId());
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        long bookingCount = amenityBookingRepository.countBySlotIdAndStatus(slotId, BookingStatus.CONFIRMED);
        if (bookingCount > 0) {
            throw new ConflictException("Booked slots cannot be edited");
        }

        Pg pg = pgService.getPgOrThrow(request.getPgId());
        slot.setPg(pg);
        slot.setAmenityType(request.getAmenityType());
        slot.setSlotDate(request.getSlotDate());
        slot.setStartTime(request.getStartTime());
        slot.setEndTime(request.getEndTime());
        slot.setCapacity(normalizedCapacity(request.getAmenityType(), requestedCapacity(request.getCapacity())));
        slot.setFacilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()));
        slot.setResourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()));

        return toResponse(amenitySlotRepository.save(slot), null, null);
    }

    @Transactional
    public void deleteSlot(Long slotId) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        accessControlService.ensureManagerAssignedToPg(slot.getPg().getId());
        if (slot.getSlotDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Past slots cannot be deleted");
        }
        long bookingCount = amenityBookingRepository.countBySlotIdAndStatus(slotId, BookingStatus.CONFIRMED);
        if (bookingCount > 0) {
            throw new ConflictException("Booked slots cannot be deleted");
        }
        amenitySlotRepository.delete(slot);
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
                .stream().map(booking -> toResponse(booking.getSlot(), null, booking)).toList();
    }

    @Transactional
    public AmenityBookingResponse joinOpenInvite(Long slotId) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        if (!isShareable(slot.getAmenityType())) {
            throw new BadRequestException("This amenity cannot be joined as a shared booking");
        }
        return bookSlot(new AmenityBookingRequest() {{
            setSlotId(slotId);
            setIsOpenInvite(false);
        }});
    }

    private AmenityBookingResponse toResponse(AmenityBooking booking) {
        AmenityBooking hostBooking = isShareable(booking.getSlot().getAmenityType())
                ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(
                        booking.getSlot().getId(),
                        BookingStatus.CONFIRMED
                ).orElse(null)
                : null;
        return toResponse(booking.getSlot(), booking, hostBooking);
    }

    private AmenityBookingResponse toManagerResponse(AmenitySlot slot) {
        AmenityBooking firstBooking = amenityBookingRepository
                .findFirstBySlotIdAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED)
                .orElse(null);
        AmenityBooking hostBooking = isShareable(slot.getAmenityType())
                ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED).orElse(null)
                : null;
        return toResponse(slot, firstBooking, hostBooking);
    }

    private AmenityBookingResponse toResponse(AmenitySlot slot, AmenityBooking booking, AmenityBooking hostBooking) {
        long bookingCount = amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED);
        boolean shareable = isShareable(slot.getAmenityType());
        boolean openInvite = (booking != null && Boolean.TRUE.equals(booking.getOpenInvite()))
                || (hostBooking != null && Boolean.TRUE.equals(hostBooking.getOpenInvite()));
        AmenityBooking firstBooking = booking != null
                ? booking
                : hostBooking != null
                    ? hostBooking
                    : amenityBookingRepository.findFirstBySlotIdAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED).orElse(null);
        int effectiveCapacity = normalizedCapacity(slot.getAmenityType(), slot.getCapacity());
        return AmenityBookingResponse.builder()
                .bookingId(booking != null ? booking.getId() : null)
                .slotId(slot.getId())
                .pgId(slot.getPg().getId())
                .tenantName(booking != null ? booking.getTenantProfile().getUser().getName() : null)
                .hostName(hostBooking != null ? hostBooking.getTenantProfile().getUser().getName() : null)
                .bookedByName(firstBooking != null ? firstBooking.getTenantProfile().getUser().getName() : null)
                .amenityType(slot.getAmenityType())
                .facilityName(slot.getFacilityName())
                .resourceName(slot.getResourceName())
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .capacity(effectiveCapacity)
                .bookingCount(bookingCount)
                .openInvite(shareable && openInvite)
                .joinable(shareable && booking == null && hostBooking != null && bookingCount < effectiveCapacity)
                .shareable(shareable)
                .status(booking != null ? booking.getStatus() : null)
                .build();
    }

    private boolean isShareable(AmenityType amenityType) {
        return amenityType != AmenityType.WASHING_MACHINE;
    }

    private void ensureNoOverlappingBooking(AmenitySlot slot, Long tenantProfileId) {
        List<AmenityBooking> existingBookings = amenityBookingRepository
                .findByTenantProfileIdAndStatusOrderByCreatedAtDesc(tenantProfileId, BookingStatus.CONFIRMED);
        boolean overlaps = existingBookings.stream()
                .map(AmenityBooking::getSlot)
                .filter(existingSlot -> existingSlot.getSlotDate().equals(slot.getSlotDate()))
                .anyMatch(existingSlot -> existingSlot.getStartTime().isBefore(slot.getEndTime())
                        && slot.getStartTime().isBefore(existingSlot.getEndTime()));
        if (overlaps) {
            throw new ConflictException("You already have another amenity booking that overlaps with this time");
        }
    }

    private int requestedCapacity(Integer requestedCapacity) {
        if (requestedCapacity == null || requestedCapacity < 1) {
            throw new BadRequestException("Capacity must be at least 1");
        }
        return requestedCapacity;
    }

    private String normalizedLocation(AmenityType amenityType, String facilityName) {
        if (facilityName != null && !facilityName.isBlank()) {
            return facilityName.trim();
        }
        return amenityType == AmenityType.WASHING_MACHINE ? "Laundry Room" : "Common Area";
    }

    private String normalizedResourceLabel(AmenityType amenityType, String resourceName) {
        if (resourceName != null && !resourceName.isBlank()) {
            return resourceName.trim();
        }
        return defaultResourceName(amenityType);
    }

    private String defaultResourceName(AmenityType amenityType) {
        return switch (amenityType) {
            case WASHING_MACHINE -> "Machine";
            case TABLE_TENNIS -> "Table";
            case CARROM -> "Board";
            case BADMINTON -> "Court";
        };
    }

    private int normalizedCapacity(AmenityType amenityType, Integer requestedCapacity) {
        if (amenityType == AmenityType.WASHING_MACHINE) {
            return 1;
        }
        return requestedCapacity(requestedCapacity);
    }
}
