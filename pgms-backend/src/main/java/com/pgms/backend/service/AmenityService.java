package com.pgms.backend.service;

import com.pgms.backend.dto.amenity.AmenityBookingRequest;
import com.pgms.backend.dto.amenity.AmenityBookingResponse;
import com.pgms.backend.dto.amenity.AmenityConfigCreateRequest;
import com.pgms.backend.dto.amenity.AmenityConfigResponse;
import com.pgms.backend.dto.amenity.AmenityConfigUpdateRequest;
import com.pgms.backend.dto.amenity.AmenitySlotCreateRequest;
import com.pgms.backend.dto.amenity.AmenitySlotUpdateRequest;
import com.pgms.backend.entity.AmenityBooking;
import com.pgms.backend.entity.AmenityConfig;
import com.pgms.backend.entity.AmenitySlot;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.AmenityType;
import com.pgms.backend.entity.enums.BookingStatus;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.ConflictException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.AmenityBookingRepository;
import com.pgms.backend.repository.AmenityConfigRepository;
import com.pgms.backend.repository.AmenitySlotRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AmenityService {

    private static final int MAX_GENERATION_DAYS = 2;

    private final AmenitySlotRepository amenitySlotRepository;
    private final AmenityBookingRepository amenityBookingRepository;
    private final AmenityConfigRepository amenityConfigRepository;
    private final AccessControlService accessControlService;
    private final PgService pgService;

    public AmenityService(AmenitySlotRepository amenitySlotRepository,
                          AmenityBookingRepository amenityBookingRepository,
                          AmenityConfigRepository amenityConfigRepository,
                          AccessControlService accessControlService,
                          PgService pgService) {
        this.amenitySlotRepository = amenitySlotRepository;
        this.amenityBookingRepository = amenityBookingRepository;
        this.amenityConfigRepository = amenityConfigRepository;
        this.accessControlService = accessControlService;
        this.pgService = pgService;
    }

    @Transactional
    public List<AmenityConfigResponse> getManagerConfigs() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        List<AmenityConfig> configs = ensureConfigsForPgs(pgIds);
        syncAutomaticSlotsForPgs(pgIds);
        return configs.stream()
                .sorted(Comparator.comparing((AmenityConfig config) -> config.getPg().getId())
                        .thenComparing(AmenityConfig::getDisplayName)
                        .thenComparing(AmenityConfig::getId))
                .map(this::toConfigResponse)
                .toList();
    }

    @Transactional
    public AmenityConfigResponse createManagerConfig(AmenityConfigCreateRequest request) {
        accessControlService.ensureManagerAssignedToPg(request.getPgId());
        if (request.getAmenityType() != AmenityType.CUSTOM) {
            List<AmenityConfig> existing = amenityConfigRepository.findByPgIdAndAmenityTypeOrderByDisplayNameAscIdAsc(request.getPgId(), request.getAmenityType());
            if (!existing.isEmpty()) {
                AmenityConfig config = existing.get(0);
                applyCreateAsUpsert(config, request);
                AmenityConfig saved = amenityConfigRepository.save(config);
                syncConfigSlots(saved);
                return toConfigResponse(saved);
            }
        }
        AmenityConfig config = amenityConfigRepository.save(buildConfig(pgService.getPgOrThrow(request.getPgId()), request));
        syncConfigSlots(config);
        return toConfigResponse(config);
    }

    @Transactional
    public AmenityConfigResponse updateManagerConfig(Long configId, AmenityConfigUpdateRequest request) {
        AmenityConfig config = amenityConfigRepository.findById(configId)
                .orElseThrow(() -> new NotFoundException("Amenity control not found"));
        accessControlService.ensureManagerAssignedToPg(config.getPg().getId());
        applyUpdate(config, request);
        AmenityConfig saved = amenityConfigRepository.save(config);
        syncConfigSlots(saved);
        return toConfigResponse(saved);
    }

    @Transactional
    public void deleteManagerConfig(Long configId) {
        AmenityConfig config = amenityConfigRepository.findById(configId)
                .orElseThrow(() -> new NotFoundException("Amenity control not found"));
        accessControlService.ensureManagerAssignedToPg(config.getPg().getId());
        List<AmenitySlot> slots = amenitySlotRepository.findByAmenityConfigIdOrderBySlotDateAscStartTimeAsc(configId);
        boolean hasConfirmedBookings = slots.stream()
                .anyMatch(slot -> amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED) > 0);
        if (hasConfirmedBookings) {
            throw new ConflictException("This amenity still has booked slots. Disable it or wait until bookings are cleared.");
        }
        List<Long> slotIds = slots.stream().map(AmenitySlot::getId).toList();
        if (!slotIds.isEmpty()) {
            deleteSlotsWithBookings(slotIds, slots);
        }
        amenityConfigRepository.delete(config);
    }

    @Transactional
    public AmenityBookingResponse createSlot(AmenitySlotCreateRequest request) {
        AmenityConfigCreateRequest createRequest = new AmenityConfigCreateRequest();
        createRequest.setPgId(request.getPgId());
        createRequest.setAmenityType(request.getAmenityType());
        createRequest.setDisplayName(defaultDisplayName(request.getAmenityType()));
        createRequest.setResourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()));
        createRequest.setFacilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()));
        createRequest.setUnitCount(request.getAmenityType() == AmenityType.WASHING_MACHINE ? requestedPositive(request.getCapacity(), "Unit count") : 1);
        createRequest.setCapacity(request.getAmenityType() == AmenityType.WASHING_MACHINE ? 1 : requestedPositive(request.getCapacity(), "Capacity"));
        createRequest.setSlotDurationMinutes(request.getAmenityType() == AmenityType.WASHING_MACHINE ? 30 : 60);
        createRequest.setStartTime(request.getStartTime());
        createRequest.setEndTime(request.getEndTime());
        createRequest.setEnabled(true);
        createRequest.setMaintenanceMode(false);
        AmenityConfigResponse config = createManagerConfig(createRequest);
        AmenityConfig saved = amenityConfigRepository.findById(config.getId())
                .orElseThrow(() -> new NotFoundException("Amenity control not found"));
        AmenitySlot firstSlot = amenitySlotRepository.findByAmenityConfigIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(
                saved.getId(),
                LocalDate.now(),
                LocalDate.now().plusDays(MAX_GENERATION_DAYS - 1L)
        ).stream().findFirst().orElseThrow(() -> new NotFoundException("No amenity slot generated"));
        return toResponse(firstSlot, null, null);
    }

    @Transactional
    public AmenityBookingResponse updateSlot(Long slotId, AmenitySlotUpdateRequest request) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        AmenityConfig config = requireConfig(slot);
        AmenityConfigUpdateRequest updateRequest = new AmenityConfigUpdateRequest();
        updateRequest.setAmenityType(request.getAmenityType());
        updateRequest.setDisplayName(defaultDisplayName(request.getAmenityType()));
        updateRequest.setResourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()));
        updateRequest.setFacilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()));
        updateRequest.setUnitCount(request.getAmenityType() == AmenityType.WASHING_MACHINE ? requestedPositive(request.getCapacity(), "Unit count") : config.getUnitCount());
        updateRequest.setCapacity(request.getAmenityType() == AmenityType.WASHING_MACHINE ? 1 : requestedPositive(request.getCapacity(), "Capacity"));
        updateRequest.setSlotDurationMinutes((int) Math.max(15, java.time.Duration.between(request.getStartTime(), request.getEndTime()).toMinutes()));
        updateRequest.setStartTime(request.getStartTime());
        updateRequest.setEndTime(request.getEndTime());
        updateRequest.setEnabled(config.getEnabled());
        updateRequest.setMaintenanceMode(config.getMaintenanceMode());
        AmenityConfigResponse updated = updateManagerConfig(config.getId(), updateRequest);
        AmenityConfig saved = amenityConfigRepository.findById(updated.getId())
                .orElseThrow(() -> new NotFoundException("Amenity control not found"));
        AmenitySlot refreshed = amenitySlotRepository.findByAmenityConfigIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(
                saved.getId(),
                LocalDate.now(),
                LocalDate.now().plusDays(MAX_GENERATION_DAYS - 1L)
        ).stream().findFirst().orElseThrow(() -> new NotFoundException("No amenity slot generated"));
        return toResponse(refreshed, null, null);
    }

    @Transactional
    public void deleteSlot(Long slotId) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        AmenityConfig config = requireConfig(slot);
        deleteManagerConfig(config.getId());
    }

    @Transactional
    public List<AmenityBookingResponse> getManagerSlots() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            return List.of();
        }
        syncAutomaticSlotsForPgs(pgIds);
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(MAX_GENERATION_DAYS - 1L);
        return amenitySlotRepository.findByPgIdInAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(pgIds, start, end).stream()
                .filter(this::isUpcomingSlot)
                .sorted(Comparator.comparing(AmenitySlot::getSlotDate)
                        .thenComparing(AmenitySlot::getStartTime)
                        .thenComparing(slot -> displayName(requireConfig(slot)))
                        .thenComparing(slot -> safe(slot.getResourceName())))
                .map(this::toManagerResponse)
                .toList();
    }

    @Transactional
    public List<AmenityBookingResponse> getTenantAvailableSlots() {
        TenantProfile tenantProfile = accessControlService.getCurrentTenantProfile();
        Long pgId = tenantProfile.getPg().getId();
        syncAutomaticSlotsForPg(pgId);
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(MAX_GENERATION_DAYS - 1L);
        return amenitySlotRepository.findByPgIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(pgId, start, end).stream()
                .filter(this::isUpcomingSlot)
                .map(slot -> {
                    AmenityBooking ownBooking = amenityBookingRepository
                            .findBySlotIdAndTenantProfileIdAndStatus(slot.getId(), tenantProfile.getId(), BookingStatus.CONFIRMED)
                            .orElse(null);
                    AmenityConfig config = requireConfig(slot);
                    boolean visible = Boolean.TRUE.equals(config.getEnabled()) && !Boolean.TRUE.equals(config.getMaintenanceMode());
                    if (!visible && ownBooking == null) {
                        return null;
                    }
                    AmenityBooking hostBooking = ownBooking == null && isShareable(slot)
                            ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED)
                            .filter(booking -> !booking.getTenantProfile().getId().equals(tenantProfile.getId()))
                            .orElse(null)
                            : null;
                    return toResponse(slot, ownBooking, hostBooking);
                })
                .filter(item -> item != null)
                .sorted(Comparator.comparingInt(this::tenantAvailabilityRank)
                        .thenComparing(AmenityBookingResponse::getSlotDate)
                        .thenComparing(AmenityBookingResponse::getStartTime)
                        .thenComparing(item -> safe(item.getDisplayName()))
                        .thenComparing(item -> safe(item.getResourceName())))
                .toList();
    }

    @Transactional
    public AmenityBookingResponse bookSlot(AmenityBookingRequest request) {
        AmenitySlot slot = amenitySlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        TenantProfile tenantProfile = accessControlService.getCurrentTenantProfile();
        if (!slot.getPg().getId().equals(tenantProfile.getPg().getId())) {
            throw new BadRequestException("Slot does not belong to tenant's PG");
        }
        syncAutomaticSlotsForPg(slot.getPg().getId());
        AmenityConfig config = requireConfig(slot);
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new BadRequestException("This amenity is disabled by management");
        }
        if (Boolean.TRUE.equals(config.getMaintenanceMode())) {
            throw new BadRequestException("This amenity is under maintenance");
        }
        if (!isUpcomingSlot(slot)) {
            throw new BadRequestException("This slot is already closed");
        }
        if (amenityBookingRepository.findBySlotIdAndTenantProfileIdAndStatus(slot.getId(), tenantProfile.getId(), BookingStatus.CONFIRMED).isPresent()) {
            throw new ConflictException("You already have a booking for this slot");
        }
        ensureNoOverlappingBooking(slot, tenantProfile.getId());
        List<AmenityBooking> existingBookings = amenityBookingRepository.findBySlotIdAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED);
        if (existingBookings.size() >= effectiveCapacity(slot)) {
            throw new ConflictException("Slot is full");
        }
        boolean shareable = isShareable(slot);
        if (Boolean.TRUE.equals(request.getIsOpenInvite()) && !shareable) {
            throw new BadRequestException("Open invite is only available for shared amenities");
        }
        AmenityBooking hostBooking = shareable
                ? existingBookings.stream().filter(booking -> Boolean.TRUE.equals(booking.getOpenInvite())).findFirst().orElse(null)
                : null;
        if (Boolean.TRUE.equals(request.getIsOpenInvite())) {
            if (hostBooking != null) {
                throw new ConflictException("This slot already has a host");
            }
            if (!existingBookings.isEmpty()) {
                throw new ConflictException("This slot already has participants");
            }
        } else if (shareable && hostBooking == null) {
            if (existingBookings.isEmpty()) {
                throw new ConflictException("No host has opened this session yet");
            }
            throw new ConflictException("This slot cannot be joined until a host opens it");
        }
        AmenityBooking booking = amenityBookingRepository.save(AmenityBooking.builder()
                .slot(slot)
                .tenantProfile(tenantProfile)
                .status(BookingStatus.CONFIRMED)
                .openInvite(Boolean.TRUE.equals(request.getIsOpenInvite()))
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

    @Transactional
    public List<AmenityBookingResponse> getOpenInvites() {
        Long pgId = accessControlService.getCurrentTenantProfile().getPg().getId();
        syncAutomaticSlotsForPg(pgId);
        return amenityBookingRepository.findByOpenInviteTrueAndStatusOrderByCreatedAtDesc(BookingStatus.CONFIRMED).stream()
                .filter(booking -> booking.getSlot().getPg().getId().equals(pgId))
                .filter(booking -> isUpcomingSlot(booking.getSlot()))
                .map(booking -> toResponse(booking.getSlot(), null, booking))
                .filter(item -> item.isEnabled() && !item.isMaintenanceMode())
                .toList();
    }

    @Transactional
    public AmenityBookingResponse joinOpenInvite(Long slotId) {
        AmenitySlot slot = amenitySlotRepository.findById(slotId)
                .orElseThrow(() -> new NotFoundException("Slot not found"));
        if (!isShareable(slot)) {
            throw new BadRequestException("This amenity cannot be joined as a shared booking");
        }
        AmenityBooking hostBooking = amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(slotId, BookingStatus.CONFIRMED)
                .orElseThrow(() -> new ConflictException("No host has opened this session yet"));
        if (hostBooking.getTenantProfile().getId().equals(accessControlService.getCurrentTenantProfile().getId())) {
            throw new ConflictException("You are already hosting this session");
        }
        AmenityBookingRequest request = new AmenityBookingRequest();
        request.setSlotId(slotId);
        request.setIsOpenInvite(false);
        return bookSlot(request);
    }

    @Transactional
    protected List<AmenityConfig> ensureConfigsForPgs(List<Long> pgIds) {
        List<AmenityConfig> existing = amenityConfigRepository.findByPgIdInOrderByPgIdAscDisplayNameAscIdAsc(pgIds);
        List<AmenityConfig> normalizedExisting = new ArrayList<>();
        Map<Long, List<AmenityConfig>> byPg = new HashMap<>();
        for (AmenityConfig config : existing) {
            normalizedExisting.add(normalizePersistedConfig(config));
            byPg.computeIfAbsent(config.getPg().getId(), ignored -> new ArrayList<>()).add(config);
        }
        if (!normalizedExisting.isEmpty()) {
            amenityConfigRepository.saveAll(normalizedExisting);
        }

        List<AmenityConfig> created = new ArrayList<>();
        for (Long pgId : pgIds) {
            Pg pg = pgService.getPgOrThrow(pgId);
            List<AmenityConfig> pgConfigs = byPg.getOrDefault(pgId, List.of());
            Set<AmenityType> existingTypes = pgConfigs.stream()
                    .map(AmenityConfig::getAmenityType)
                    .collect(java.util.stream.Collectors.toSet());
            List<AmenitySlot> historicalSlots = amenitySlotRepository.findByPgIdOrderBySlotDateAscStartTimeAsc(pgId);
            for (AmenityType type : List.of(AmenityType.WASHING_MACHINE, AmenityType.TABLE_TENNIS, AmenityType.CARROM, AmenityType.BADMINTON)) {
                if (existingTypes.contains(type)) {
                    continue;
                }
                created.add(buildDefaultConfig(pg, type, historicalSlots));
            }
        }
        if (!created.isEmpty()) {
            existing.addAll(amenityConfigRepository.saveAll(created));
        }
        return existing;
    }

    @Transactional
    protected void syncAutomaticSlotsForPgs(List<Long> pgIds) {
        for (AmenityConfig config : ensureConfigsForPgs(pgIds)) {
            syncConfigSlots(config);
        }
    }

    @Transactional
    protected void syncAutomaticSlotsForPg(Long pgId) {
        syncAutomaticSlotsForPgs(List.of(pgId));
    }

    private void syncConfigSlots(AmenityConfig config) {
        config = normalizePersistedConfig(config);
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(MAX_GENERATION_DAYS - 1L);
        List<AmenitySlot> existingSlots = amenitySlotRepository.findByAmenityConfigIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(config.getId(), start, end);
        Map<String, AmenitySlot> existingByKey = new HashMap<>();
        for (AmenitySlot slot : existingSlots) {
            existingByKey.put(slotSignature(slot), slot);
        }

        Set<String> desiredKeys = new HashSet<>();
        List<AmenitySlot> toCreate = new ArrayList<>();

        if (Boolean.TRUE.equals(config.getEnabled()) && !Boolean.TRUE.equals(config.getMaintenanceMode())) {
            int unitCount = resolvedUnitCount(config.getAmenityType(), config.getUnitCount());
            int slotDurationMinutes = resolvedSlotDuration(config.getAmenityType(), config.getSlotDurationMinutes());
            for (int dayOffset = 0; dayOffset < MAX_GENERATION_DAYS; dayOffset++) {
                LocalDate slotDate = start.plusDays(dayOffset);
                LocalTime cursor = config.getStartTime();
                while (cursor.isBefore(config.getEndTime())) {
                    LocalTime next = cursor.plusMinutes(slotDurationMinutes);
                    if (next.isAfter(config.getEndTime())) {
                        next = config.getEndTime();
                    }
                    if (slotDate.isEqual(start) && !cursor.isAfter(LocalTime.now())) {
                        cursor = next;
                        continue;
                    }
                    for (int unitIndex = 1; unitIndex <= unitCount; unitIndex++) {
                        AmenitySlot candidate = AmenitySlot.builder()
                                .pg(config.getPg())
                                .amenityConfig(config)
                                .amenityType(config.getAmenityType())
                                .slotDate(slotDate)
                                .startTime(cursor)
                                .endTime(next)
                                .capacity(normalizedCapacity(config.getAmenityType(), config.getCapacity()))
                                .facilityName(config.getFacilityName())
                                .resourceName(unitName(config, unitIndex))
                                .build();
                        String signature = slotSignature(candidate);
                        desiredKeys.add(signature);
                        if (!existingByKey.containsKey(signature)) {
                            toCreate.add(candidate);
                        }
                    }
                    cursor = next;
                }
            }
        }

        List<AmenitySlot> removable = existingSlots.stream()
                .filter(this::isUpcomingSlot)
                .filter(slot -> amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED) == 0)
                .filter(slot -> !desiredKeys.contains(slotSignature(slot)))
                .toList();
        if (!removable.isEmpty()) {
            List<Long> slotIds = removable.stream().map(AmenitySlot::getId).toList();
            deleteSlotsWithBookings(slotIds, removable);
        }
        if (!toCreate.isEmpty()) {
            amenitySlotRepository.saveAll(toCreate);
        }
    }

    private void deleteSlotsWithBookings(List<Long> slotIds, List<AmenitySlot> slots) {
        amenityBookingRepository.deleteBySlotIdIn(slotIds);
        amenityBookingRepository.flush();
        amenitySlotRepository.deleteAll(slots);
        amenitySlotRepository.flush();
    }

    private AmenityConfig buildConfig(Pg pg, AmenityConfigCreateRequest request) {
        int slotDurationMinutes = resolvedSlotDuration(request.getAmenityType(), request.getSlotDurationMinutes());
        validateWindow(request.getStartTime(), request.getEndTime(), slotDurationMinutes);
        return AmenityConfig.builder()
                .pg(pg)
                .amenityType(request.getAmenityType())
                .displayName(normalizedDisplayName(request.getAmenityType(), request.getDisplayName()))
                .resourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()))
                .facilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()))
                .unitCount(resolvedUnitCount(request.getAmenityType(), request.getUnitCount()))
                .capacity(normalizedCapacity(request.getAmenityType(), request.getCapacity()))
                .slotDurationMinutes(slotDurationMinutes)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .enabled(Boolean.TRUE.equals(request.getEnabled()))
                .maintenanceMode(Boolean.TRUE.equals(request.getMaintenanceMode()))
                .build();
    }

    private void applyUpdate(AmenityConfig config, AmenityConfigUpdateRequest request) {
        int slotDurationMinutes = resolvedSlotDuration(request.getAmenityType(), request.getSlotDurationMinutes());
        validateWindow(request.getStartTime(), request.getEndTime(), slotDurationMinutes);
        config.setAmenityType(request.getAmenityType());
        config.setDisplayName(normalizedDisplayName(request.getAmenityType(), request.getDisplayName()));
        config.setResourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()));
        config.setFacilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()));
        config.setUnitCount(resolvedUnitCount(request.getAmenityType(), request.getUnitCount()));
        config.setCapacity(normalizedCapacity(request.getAmenityType(), request.getCapacity()));
        config.setSlotDurationMinutes(slotDurationMinutes);
        config.setStartTime(request.getStartTime());
        config.setEndTime(request.getEndTime());
        config.setEnabled(Boolean.TRUE.equals(request.getEnabled()));
        config.setMaintenanceMode(Boolean.TRUE.equals(request.getMaintenanceMode()));
    }

    private void applyCreateAsUpsert(AmenityConfig config, AmenityConfigCreateRequest request) {
        int slotDurationMinutes = resolvedSlotDuration(request.getAmenityType(), request.getSlotDurationMinutes());
        validateWindow(request.getStartTime(), request.getEndTime(), slotDurationMinutes);
        config.setDisplayName(normalizedDisplayName(request.getAmenityType(), request.getDisplayName()));
        config.setResourceName(normalizedResourceLabel(request.getAmenityType(), request.getResourceName()));
        config.setFacilityName(normalizedLocation(request.getAmenityType(), request.getFacilityName()));
        config.setUnitCount(resolvedUnitCount(request.getAmenityType(), request.getUnitCount()));
        config.setCapacity(normalizedCapacity(request.getAmenityType(), request.getCapacity()));
        config.setSlotDurationMinutes(slotDurationMinutes);
        config.setStartTime(request.getStartTime());
        config.setEndTime(request.getEndTime());
        config.setEnabled(Boolean.TRUE.equals(request.getEnabled()));
        config.setMaintenanceMode(Boolean.TRUE.equals(request.getMaintenanceMode()));
    }

    private AmenityConfig buildDefaultConfig(Pg pg, AmenityType type, List<AmenitySlot> historicalSlots) {
        List<AmenitySlot> matchingSlots = historicalSlots.stream()
                .filter(slot -> slot.getAmenityType() == type)
                .toList();
        AmenitySlot seed = matchingSlots.isEmpty() ? null : matchingSlots.get(0);
        LocalTime start = matchingSlots.stream().map(AmenitySlot::getStartTime).min(LocalTime::compareTo).orElse(defaultStartTime(type));
        LocalTime end = matchingSlots.stream().map(AmenitySlot::getEndTime).max(LocalTime::compareTo).orElse(defaultEndTime(type));
        int duration = matchingSlots.stream()
                .mapToInt(slot -> (int) java.time.Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes())
                .filter(value -> value > 0)
                .findFirst()
                .orElse(defaultSlotDuration(type));
        return AmenityConfig.builder()
                .pg(pg)
                .amenityType(type)
                .displayName(defaultDisplayName(type))
                .resourceName(seed != null && seed.getResourceName() != null && !seed.getResourceName().isBlank() ? stripUnitNumber(seed.getResourceName()) : defaultResourceName(type))
                .facilityName(seed != null && seed.getFacilityName() != null && !seed.getFacilityName().isBlank() ? seed.getFacilityName() : defaultFacilityName(type))
                .unitCount(type == AmenityType.WASHING_MACHINE ? inferredUnitCount(matchingSlots) : Math.max(1, inferredUnitCount(matchingSlots)))
                .capacity(type == AmenityType.WASHING_MACHINE ? 1 : inferredCapacity(type, matchingSlots))
                .slotDurationMinutes(duration)
                .startTime(start)
                .endTime(end)
                .enabled(true)
                .maintenanceMode(false)
                .build();
    }

    private AmenityConfigResponse toConfigResponse(AmenityConfig config) {
        config = normalizePersistedConfig(config);
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(MAX_GENERATION_DAYS - 1L);
        List<AmenitySlot> slots = amenitySlotRepository.findByAmenityConfigIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(config.getId(), start, end).stream()
                .filter(this::isUpcomingSlot)
                .toList();
        long booked = slots.stream()
                .filter(slot -> amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED) > 0)
                .count();
        return AmenityConfigResponse.builder()
                .id(config.getId())
                .pgId(config.getPg().getId())
                .amenityType(config.getAmenityType())
                .displayName(displayName(config))
                .resourceName(config.getResourceName())
                .facilityName(config.getFacilityName())
                .unitCount(resolvedUnitCount(config.getAmenityType(), config.getUnitCount()))
                .capacity(normalizedCapacity(config.getAmenityType(), config.getCapacity()))
                .slotDurationMinutes(resolvedSlotDuration(config.getAmenityType(), config.getSlotDurationMinutes()))
                .startTime(config.getStartTime())
                .endTime(config.getEndTime())
                .enabled(Boolean.TRUE.equals(config.getEnabled()))
                .maintenanceMode(Boolean.TRUE.equals(config.getMaintenanceMode()))
                .upcomingOpenSlots(slots.size() - booked)
                .upcomingBookedSlots(booked)
                .build();
    }

    private AmenityBookingResponse toResponse(AmenityBooking booking) {
        AmenityBooking hostBooking = isShareable(booking.getSlot())
                ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(booking.getSlot().getId(), BookingStatus.CONFIRMED).orElse(null)
                : null;
        return toResponse(booking.getSlot(), booking, hostBooking);
    }

    private AmenityBookingResponse toManagerResponse(AmenitySlot slot) {
        AmenityBooking firstBooking = amenityBookingRepository.findFirstBySlotIdAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED).orElse(null);
        AmenityBooking hostBooking = isShareable(slot)
                ? amenityBookingRepository.findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED).orElse(null)
                : null;
        return toResponse(slot, firstBooking, hostBooking);
    }

    private AmenityBookingResponse toResponse(AmenitySlot slot, AmenityBooking booking, AmenityBooking hostBooking) {
        AmenityConfig config = requireConfig(slot);
        long bookingCount = amenityBookingRepository.countBySlotIdAndStatus(slot.getId(), BookingStatus.CONFIRMED);
        boolean shareable = isShareable(slot);
        boolean openInvite = (booking != null && Boolean.TRUE.equals(booking.getOpenInvite()))
                || (hostBooking != null && Boolean.TRUE.equals(hostBooking.getOpenInvite()));
        AmenityBooking firstBooking = booking != null
                ? booking
                : hostBooking != null
                ? hostBooking
                : amenityBookingRepository.findFirstBySlotIdAndStatusOrderByCreatedAtAsc(slot.getId(), BookingStatus.CONFIRMED).orElse(null);
        int capacity = effectiveCapacity(slot);
        return AmenityBookingResponse.builder()
                .bookingId(booking != null ? booking.getId() : null)
                .slotId(slot.getId())
                .configId(config.getId())
                .pgId(slot.getPg().getId())
                .tenantName(booking != null ? booking.getTenantProfile().getUser().getName() : null)
                .hostName(hostBooking != null ? hostBooking.getTenantProfile().getUser().getName() : null)
                .bookedByName(firstBooking != null ? firstBooking.getTenantProfile().getUser().getName() : null)
                .amenityType(slot.getAmenityType())
                .displayName(displayName(config))
                .facilityName(slot.getFacilityName())
                .resourceName(slot.getResourceName())
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .capacity(capacity)
                .bookingCount(bookingCount)
                .openInvite(shareable && openInvite)
                .joinable(shareable && booking == null && hostBooking != null && bookingCount < capacity)
                .shareable(shareable)
                .enabled(Boolean.TRUE.equals(config.getEnabled()))
                .maintenanceMode(Boolean.TRUE.equals(config.getMaintenanceMode()))
                .status(booking != null ? booking.getStatus() : null)
                .build();
    }

    private AmenityConfig requireConfig(AmenitySlot slot) {
        if (slot.getAmenityConfig() != null) {
            return normalizePersistedConfig(slot.getAmenityConfig());
        }
        List<AmenityConfig> configs = amenityConfigRepository.findByPgIdAndAmenityTypeOrderByDisplayNameAscIdAsc(slot.getPg().getId(), slot.getAmenityType());
        if (configs.isEmpty()) {
            Pg pg = pgService.getPgOrThrow(slot.getPg().getId());
            AmenityConfig created = amenityConfigRepository.save(buildDefaultConfig(pg, slot.getAmenityType(), List.of(slot)));
            slot.setAmenityConfig(created);
            amenitySlotRepository.save(slot);
            return normalizePersistedConfig(created);
        }
        slot.setAmenityConfig(configs.get(0));
        amenitySlotRepository.save(slot);
        return normalizePersistedConfig(configs.get(0));
    }

    private int tenantAvailabilityRank(AmenityBookingResponse item) {
        if (!item.isEnabled() || item.isMaintenanceMode()) {
            return item.getBookingId() != null ? 4 : 5;
        }
        if (item.getBookingId() != null) {
            return 0;
        }
        if (item.isJoinable()) {
            return 1;
        }
        if ((item.getBookingCount() == null || item.getBookingCount() == 0) && !item.isOpenInvite()) {
            return 2;
        }
        return 3;
    }

    private boolean isShareable(AmenitySlot slot) {
        if (slot.getAmenityType() == AmenityType.WASHING_MACHINE) {
            return false;
        }
        return effectiveCapacity(slot) > 1;
    }

    private int effectiveCapacity(AmenitySlot slot) {
        return normalizedCapacity(slot.getAmenityType(), slot.getCapacity());
    }

    private void ensureNoOverlappingBooking(AmenitySlot slot, Long tenantProfileId) {
        boolean overlaps = amenityBookingRepository.findByTenantProfileIdAndStatusOrderByCreatedAtDesc(tenantProfileId, BookingStatus.CONFIRMED).stream()
                .map(AmenityBooking::getSlot)
                .filter(existingSlot -> existingSlot.getSlotDate().equals(slot.getSlotDate()))
                .anyMatch(existingSlot -> existingSlot.getStartTime().isBefore(slot.getEndTime())
                        && slot.getStartTime().isBefore(existingSlot.getEndTime()));
        if (overlaps) {
            throw new ConflictException("You already have another amenity booking that overlaps with this time");
        }
    }

    private void validateWindow(LocalTime startTime, LocalTime endTime, Integer slotDurationMinutes) {
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Start time and end time are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("End time must be after start time");
        }
        if (requestedPositive(slotDurationMinutes, "Slot duration") >= java.time.Duration.between(startTime, endTime).toMinutes()) {
            throw new BadRequestException("Slot duration must be smaller than the overall window");
        }
    }

    private int requestedPositive(Integer value, String label) {
        if (value == null || value < 1) {
            throw new BadRequestException(label + " must be at least 1");
        }
        return value;
    }

    private int resolvedUnitCount(AmenityType type, Integer value) {
        if (value != null && value > 0) {
            return value;
        }
        return type == AmenityType.WASHING_MACHINE ? 1 : 1;
    }

    private int resolvedSlotDuration(AmenityType type, Integer value) {
        if (value != null && value > 0) {
            return value;
        }
        return defaultSlotDuration(type);
    }

    private String normalizedDisplayName(AmenityType amenityType, String value) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }
        return defaultDisplayName(amenityType);
    }

    private String normalizedLocation(AmenityType amenityType, String facilityName) {
        if (facilityName != null && !facilityName.isBlank()) {
            return facilityName.trim();
        }
        return defaultFacilityName(amenityType);
    }

    private String normalizedResourceLabel(AmenityType amenityType, String resourceName) {
        if (resourceName != null && !resourceName.isBlank()) {
            return resourceName.trim();
        }
        return defaultResourceName(amenityType);
    }

    private boolean isUpcomingSlot(AmenitySlot slot) {
        LocalDate today = LocalDate.now();
        if (slot.getSlotDate().isBefore(today)) {
            return false;
        }
        if (slot.getSlotDate().isAfter(today.plusDays(MAX_GENERATION_DAYS - 1L))) {
            return false;
        }
        return !slot.getSlotDate().isEqual(today) || slot.getStartTime().isAfter(LocalTime.now());
    }

    private String slotSignature(AmenitySlot slot) {
        return slot.getSlotDate() + "|" + slot.getStartTime() + "|" + slot.getEndTime() + "|" + safe(slot.getResourceName());
    }

    private String unitName(AmenityConfig config, int unitIndex) {
        if (resolvedUnitCount(config.getAmenityType(), config.getUnitCount()) == 1) {
            return config.getResourceName();
        }
        return config.getResourceName() + " " + unitIndex;
    }

    private AmenityConfig normalizePersistedConfig(AmenityConfig config) {
        if (config == null) {
            return null;
        }
        if (config.getDisplayName() == null || config.getDisplayName().isBlank()) {
            config.setDisplayName(defaultDisplayName(config.getAmenityType()));
        }
        if (config.getResourceName() == null || config.getResourceName().isBlank()) {
            config.setResourceName(defaultResourceName(config.getAmenityType()));
        }
        if (config.getFacilityName() == null || config.getFacilityName().isBlank()) {
            config.setFacilityName(defaultFacilityName(config.getAmenityType()));
        }
        config.setUnitCount(resolvedUnitCount(config.getAmenityType(), config.getUnitCount()));
        config.setCapacity(normalizedCapacity(config.getAmenityType(), config.getCapacity()));
        config.setSlotDurationMinutes(resolvedSlotDuration(config.getAmenityType(), config.getSlotDurationMinutes()));
        if (config.getStartTime() == null) {
            config.setStartTime(defaultStartTime(config.getAmenityType()));
        }
        if (config.getEndTime() == null) {
            config.setEndTime(defaultEndTime(config.getAmenityType()));
        }
        if (config.getEnabled() == null) {
            config.setEnabled(true);
        }
        if (config.getMaintenanceMode() == null) {
            config.setMaintenanceMode(false);
        }
        return config;
    }

    private String stripUnitNumber(String value) {
        String trimmed = safe(value);
        int lastSpace = trimmed.lastIndexOf(' ');
        if (lastSpace < 0) {
            return trimmed;
        }
        String suffix = trimmed.substring(lastSpace + 1);
        if (suffix.chars().allMatch(Character::isDigit)) {
            return trimmed.substring(0, lastSpace).trim();
        }
        return trimmed;
    }

    private int inferredUnitCount(List<AmenitySlot> slots) {
        if (slots.isEmpty()) {
            return 1;
        }
        return (int) slots.stream().map(slot -> safe(slot.getResourceName())).distinct().count();
    }

    private int inferredCapacity(AmenityType type, List<AmenitySlot> slots) {
        if (type == AmenityType.WASHING_MACHINE) {
            return 1;
        }
        return slots.stream().map(AmenitySlot::getCapacity).max(Integer::compareTo).orElse(defaultCapacity(type));
    }

    private String defaultDisplayName(AmenityType type) {
        return switch (type) {
            case WASHING_MACHINE -> "Washing Machine";
            case TABLE_TENNIS -> "Table Tennis";
            case CARROM -> "Carrom";
            case BADMINTON -> "Badminton";
            case CUSTOM -> "Custom Amenity";
        };
    }

    private String displayName(AmenityConfig config) {
        return config.getDisplayName() == null || config.getDisplayName().isBlank()
                ? defaultDisplayName(config.getAmenityType())
                : config.getDisplayName();
    }

    private String defaultResourceName(AmenityType type) {
        return switch (type) {
            case WASHING_MACHINE -> "Machine";
            case TABLE_TENNIS -> "Table";
            case CARROM -> "Board";
            case BADMINTON -> "Court";
            case CUSTOM -> "Unit";
        };
    }

    private String defaultFacilityName(AmenityType type) {
        return switch (type) {
            case WASHING_MACHINE -> "Laundry Room";
            case TABLE_TENNIS -> "Common Lounge";
            case CARROM -> "Rec Room";
            case BADMINTON -> "Badminton Court";
            case CUSTOM -> "Common Area";
        };
    }

    private LocalTime defaultStartTime(AmenityType type) {
        return type == AmenityType.WASHING_MACHINE ? LocalTime.of(7, 0) : LocalTime.of(18, 0);
    }

    private LocalTime defaultEndTime(AmenityType type) {
        return type == AmenityType.WASHING_MACHINE ? LocalTime.of(22, 0) : LocalTime.of(22, 0);
    }

    private int defaultSlotDuration(AmenityType type) {
        return type == AmenityType.WASHING_MACHINE ? 30 : 60;
    }

    private int defaultCapacity(AmenityType type) {
        return switch (type) {
            case WASHING_MACHINE -> 1;
            case TABLE_TENNIS -> 2;
            case CARROM -> 4;
            case BADMINTON -> 4;
            case CUSTOM -> 1;
        };
    }

    private int normalizedCapacity(AmenityType type, Integer requestedCapacity) {
        if (type == AmenityType.WASHING_MACHINE) {
            return 1;
        }
        if (requestedCapacity == null || requestedCapacity < 1) {
            return defaultCapacity(type);
        }
        return requestedCapacity;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
