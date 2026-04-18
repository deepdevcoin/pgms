package com.pgms.backend.service;

import com.pgms.backend.dto.layout.LayoutFloorResponse;
import com.pgms.backend.dto.layout.LayoutPgResponse;
import com.pgms.backend.dto.layout.LayoutResponse;
import com.pgms.backend.dto.layout.LayoutRoomResponse;
import com.pgms.backend.dto.layout.LayoutRoomStatus;
import com.pgms.backend.dto.layout.LayoutTenantRentSummaryResponse;
import com.pgms.backend.dto.layout.LayoutTenantResponse;
import com.pgms.backend.dto.pg.RoomCreateRequest;
import com.pgms.backend.dto.pg.PgSummaryResponse;
import com.pgms.backend.dto.pg.RoomCleaningStatusUpdateRequest;
import com.pgms.backend.dto.pg.RoomResponse;
import com.pgms.backend.dto.pg.RoomUpdateRequest;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.CleaningStatus;
import com.pgms.backend.entity.enums.RentStatus;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.exception.ConflictException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.RentRecordRepository;
import com.pgms.backend.repository.RoomRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PgService {

    private final PgRepository pgRepository;
    private final RoomRepository roomRepository;
    private final TenantProfileRepository tenantProfileRepository;
    private final RentRecordRepository rentRecordRepository;
    private final AccessControlService accessControlService;

    public PgService(PgRepository pgRepository,
                     RoomRepository roomRepository,
                     TenantProfileRepository tenantProfileRepository,
                     RentRecordRepository rentRecordRepository,
                     AccessControlService accessControlService) {
        this.pgRepository = pgRepository;
        this.roomRepository = roomRepository;
        this.tenantProfileRepository = tenantProfileRepository;
        this.rentRecordRepository = rentRecordRepository;
        this.accessControlService = accessControlService;
    }

    public List<PgSummaryResponse> getAllPgsWithSummary() {
        return pgRepository.findAll().stream().map(this::toSummary).toList();
    }

    public List<RoomResponse> getRoomsByPgId(Long pgId, RoomStatus status, Integer floor) {
        List<Room> rooms;
        if (status != null && floor != null) {
            rooms = roomRepository.findByPgIdAndStatusAndFloor(pgId, status, floor);
        } else if (status != null) {
            rooms = roomRepository.findByPgIdAndStatus(pgId, status);
        } else if (floor != null) {
            rooms = roomRepository.findByPgIdAndFloor(pgId, floor);
        } else {
            rooms = roomRepository.findByPgId(pgId);
        }
        return rooms.stream().map(this::toRoomResponse).toList();
    }

    public List<LayoutPgResponse> getAssignedPgsForCurrentManager() {
        List<Long> pgIds = accessControlService.getAssignedPgIdsForCurrentManager();
        Map<Long, Pg> pgById = pgRepository.findAllById(pgIds).stream()
                .collect(Collectors.toMap(Pg::getId, Function.identity()));
        return pgIds.stream()
                .map(pgById::get)
                .filter(pg -> pg != null)
                .map(pg -> LayoutPgResponse.builder()
                        .id(pg.getId())
                        .name(pg.getName())
                        .address(pg.getAddress())
                        .totalFloors(pg.getTotalFloors())
                        .build())
                .toList();
    }

    public LayoutResponse getLayoutForManagerPg(Long pgId) {
        accessControlService.ensureManagerAssignedToPg(pgId);
        return buildLayoutResponse(pgId);
    }

    public LayoutResponse getLayoutForOwnerPg(Long pgId) {
        return buildLayoutResponse(pgId);
    }

    public List<LayoutPgResponse> getAllPgsForOwner() {
        return pgRepository.findAll().stream()
                .map(pg -> LayoutPgResponse.builder()
                        .id(pg.getId())
                        .name(pg.getName())
                        .address(pg.getAddress())
                        .totalFloors(pg.getTotalFloors())
                        .build())
                .toList();
    }

    @Transactional
    public RoomResponse createRoomForOwner(Long pgId, RoomCreateRequest request) {
        Pg pg = getPgOrThrow(pgId);
        roomRepository.findByPgAndRoomNumber(pg, request.getRoomNumber().trim())
                .ifPresent(existing -> {
                    throw new ConflictException("Room number already exists in this PG");
                });

        Room room = Room.builder()
                .pg(pg)
                .roomNumber(request.getRoomNumber().trim())
                .floor(request.getFloor())
                .isAC(request.getIsAC())
                .sharingType(request.getSharingType())
                .monthlyRent(request.getMonthlyRent())
                .depositAmount(request.getDepositAmount())
                .status(request.getStatus() != null ? request.getStatus() : RoomStatus.VACANT)
                .cleaningStatus(request.getCleaningStatus() != null ? request.getCleaningStatus() : CleaningStatus.CLEAN)
                .build();

        return toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse updateCleaningStatusForOwner(Long roomId, RoomCleaningStatusUpdateRequest request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));
        room.setCleaningStatus(request.getCleaningStatus());
        return toRoomResponse(roomRepository.save(room));
    }

    private LayoutResponse buildLayoutResponse(Long pgId) {
        Pg pg = getPgOrThrow(pgId);
        List<Room> rooms = roomRepository.findByPgId(pgId).stream()
                .sorted(Comparator.comparing(Room::getFloor).thenComparing(Room::getRoomNumber))
                .toList();
        List<TenantProfile> tenants = tenantProfileRepository.findByPgId(pgId).stream()
                .filter(tenant -> tenant.getStatus() != TenantStatus.ARCHIVED)
                .toList();
        Map<Long, List<TenantProfile>> tenantsByRoomId = tenants.stream()
                .collect(Collectors.groupingBy(tenant -> tenant.getRoom().getId()));
        Map<Long, RentRecord> latestRentByTenantId = rentRecordRepository.findByTenantProfilePgIdOrderByBillingMonthDesc(pgId).stream()
                .collect(Collectors.toMap(
                        record -> record.getTenantProfile().getId(),
                        Function.identity(),
                        this::selectNewerRentRecord
                ));

        List<LayoutFloorResponse> floors = rooms.stream()
                .collect(Collectors.groupingBy(Room::getFloor))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> LayoutFloorResponse.builder()
                        .floorNumber(entry.getKey())
                        .rooms(entry.getValue().stream()
                                .map(room -> toLayoutRoomResponse(
                                        room,
                                        tenantsByRoomId.getOrDefault(room.getId(), List.of()),
                                        latestRentByTenantId
                                ))
                                .toList())
                        .build())
                .toList();

        return LayoutResponse.builder()
                .pgId(pg.getId())
                .pgName(pg.getName())
                .floors(floors)
                .build();
    }

    @Transactional
    public RoomResponse updateRoom(Long roomId, RoomUpdateRequest request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));
        accessControlService.ensureManagerAssignedToPg(room.getPg().getId());
        if (request.getMonthlyRent() != null) {
            room.setMonthlyRent(request.getMonthlyRent());
        }
        if (request.getIsAC() != null) {
            room.setIsAC(request.getIsAC());
        }
        if (request.getSharingType() != null) {
            room.setSharingType(request.getSharingType());
        }
        if (request.getStatus() != null) {
            room.setStatus(request.getStatus());
        }
        return toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse updateCleaningStatus(Long roomId, RoomCleaningStatusUpdateRequest request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));
        accessControlService.ensureManagerAssignedToPg(room.getPg().getId());
        room.setCleaningStatus(request.getCleaningStatus());
        return toRoomResponse(roomRepository.save(room));
    }

    public Pg getPgOrThrow(Long pgId) {
        return pgRepository.findById(pgId).orElseThrow(() -> new NotFoundException("PG not found"));
    }

    public PgSummaryResponse toSummary(Pg pg) {
        return PgSummaryResponse.builder()
                .id(pg.getId())
                .name(pg.getName())
                .address(pg.getAddress())
                .totalFloors(pg.getTotalFloors())
                .paymentDeadlineDay(pg.getPaymentDeadlineDay())
                .fineAmountPerDay(pg.getFineAmountPerDay())
                .slaHours(pg.getSlaHours())
                .vacantCount((int) roomRepository.countByPgIdAndStatus(pg.getId(), RoomStatus.VACANT))
                .occupiedCount((int) roomRepository.countByPgIdAndStatus(pg.getId(), RoomStatus.OCCUPIED))
                .vacatingCount((int) roomRepository.countByPgIdAndStatus(pg.getId(), RoomStatus.VACATING))
                .build();
    }

    public RoomResponse toRoomResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .pgId(room.getPg().getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .isAC(room.getIsAC())
                .sharingType(room.getSharingType())
                .monthlyRent(room.getMonthlyRent())
                .depositAmount(room.getDepositAmount())
                .status(room.getStatus())
                .cleaningStatus(room.getCleaningStatus())
                .build();
    }

    private LayoutRoomResponse toLayoutRoomResponse(Room room,
                                                    List<TenantProfile> tenants,
                                                    Map<Long, RentRecord> latestRentByTenantId) {
        int capacity = getCapacity(room.getSharingType());
        int occupiedCount = tenants.size();
        double totalDepositPaid = tenants.stream()
                .map(TenantProfile::getAdvanceAmountPaid)
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();
        double totalDepositRequired = room.getDepositAmount() * Math.max(capacity, 1);
        return LayoutRoomResponse.builder()
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .capacity(capacity)
                .occupiedCount(occupiedCount)
                .vacantSlots(Math.max(capacity - occupiedCount, 0))
                .status(getLayoutRoomStatus(room, occupiedCount, capacity))
                .cleaningStatus(room.getCleaningStatus())
                .monthlyRent(room.getMonthlyRent())
                .depositAmount(room.getDepositAmount())
                .totalDepositRequired(totalDepositRequired)
                .totalDepositPaid(totalDepositPaid)
                .isAC(room.getIsAC())
                .sharingType(room.getSharingType())
                .tenants(tenants.stream()
                        .map(tenant -> LayoutTenantResponse.builder()
                                .tenantProfileId(tenant.getId())
                                .userId(tenant.getUser().getId())
                                .name(tenant.getUser().getName())
                                .email(tenant.getUser().getEmail())
                                .phone(tenant.getUser().getPhone())
                                .joiningDate(tenant.getJoiningDate())
                                .advanceAmountPaid(tenant.getAdvanceAmountPaid())
                                .depositRequired(room.getDepositAmount())
                                .creditWalletBalance(tenant.getCreditWalletBalance())
                                .status(tenant.getStatus())
                                .rentSummary(toTenantRentSummary(latestRentByTenantId.get(tenant.getId())))
                                .build())
                        .toList())
                .build();
    }

    private LayoutTenantRentSummaryResponse toTenantRentSummary(RentRecord record) {
        if (record == null) {
            return null;
        }

        return LayoutTenantRentSummaryResponse.builder()
                .billingMonth(record.getBillingMonth())
                .amountPaid(record.getAmountPaid())
                .totalDue(record.getTotalDue())
                .remainingAmountDue(Math.max(record.getTotalDue() - record.getAmountPaid(), 0))
                .dueDate(record.getDueDate())
                .status(resolveRentStatus(record))
                .build();
    }

    private RentRecord selectNewerRentRecord(RentRecord left, RentRecord right) {
        if (left.getDueDate() == null) {
            return right;
        }
        if (right.getDueDate() == null) {
            return left;
        }
        return right.getDueDate().isAfter(left.getDueDate()) ? right : left;
    }

    private RentStatus resolveRentStatus(RentRecord record) {
        double remaining = Math.max(record.getTotalDue() - record.getAmountPaid(), 0);
        if (remaining <= 0) {
            return RentStatus.PAID;
        }
        if (record.getAmountPaid() > 0) {
            return RentStatus.PARTIAL;
        }
        if (record.getDueDate() != null && record.getDueDate().isBefore(java.time.LocalDate.now())) {
            return RentStatus.OVERDUE;
        }
        return record.getStatus();
    }

    private LayoutRoomStatus getLayoutRoomStatus(Room room, int occupiedCount, int capacity) {
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            return LayoutRoomStatus.MAINTENANCE;
        }
        if (occupiedCount <= 0) {
            return LayoutRoomStatus.AVAILABLE;
        }
        if (occupiedCount >= capacity) {
            return LayoutRoomStatus.FULL;
        }
        return LayoutRoomStatus.PARTIAL;
    }

    private int getCapacity(SharingType sharingType) {
        return switch (sharingType) {
            case SINGLE -> 1;
            case DOUBLE -> 2;
            case TRIPLE -> 3;
            case DORM -> 6;
        };
    }
}
