package com.pgms.backend.service;

import com.pgms.backend.dto.pg.PgSummaryResponse;
import com.pgms.backend.dto.pg.RoomResponse;
import com.pgms.backend.dto.pg.RoomUpdateRequest;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.RoomRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PgService {

    private final PgRepository pgRepository;
    private final RoomRepository roomRepository;
    private final AccessControlService accessControlService;

    public PgService(PgRepository pgRepository, RoomRepository roomRepository, AccessControlService accessControlService) {
        this.pgRepository = pgRepository;
        this.roomRepository = roomRepository;
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
                .build();
    }
}
