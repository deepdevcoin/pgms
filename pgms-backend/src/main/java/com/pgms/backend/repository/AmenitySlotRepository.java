package com.pgms.backend.repository;

import com.pgms.backend.entity.AmenitySlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AmenitySlotRepository extends JpaRepository<AmenitySlot, Long> {
    List<AmenitySlot> findByPgIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(Long pgId, LocalDate start, LocalDate end);
    List<AmenitySlot> findByPgIdInAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(List<Long> pgIds, LocalDate start, LocalDate end);
    List<AmenitySlot> findByPgIdOrderBySlotDateAscStartTimeAsc(Long pgId);
    List<AmenitySlot> findByPgIdInOrderBySlotDateAscStartTimeAsc(List<Long> pgIds);
    List<AmenitySlot> findByAmenityConfigIdAndSlotDateBetweenOrderBySlotDateAscStartTimeAsc(Long amenityConfigId, LocalDate start, LocalDate end);
    List<AmenitySlot> findByAmenityConfigIdOrderBySlotDateAscStartTimeAsc(Long amenityConfigId);
}
