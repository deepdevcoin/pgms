package com.pgms.backend.repository;

import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByPgId(Long pgId);
    List<Room> findByPgIdAndStatus(Long pgId, RoomStatus status);
    List<Room> findByPgIdAndFloor(Long pgId, Integer floor);
    List<Room> findByPgIdAndStatusAndFloor(Long pgId, RoomStatus status, Integer floor);
    long countByPgIdAndStatus(Long pgId, RoomStatus status);
    long countByStatus(RoomStatus status);
    Optional<Room> findByPgAndRoomNumber(Pg pg, String roomNumber);
}
