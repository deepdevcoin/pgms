package com.pgms.backend.repository;

import com.pgms.backend.entity.AmenityBooking;
import com.pgms.backend.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AmenityBookingRepository extends JpaRepository<AmenityBooking, Long> {
    List<AmenityBooking> findBySlotPgIdOrderByCreatedAtDesc(Long pgId);
    List<AmenityBooking> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<AmenityBooking> findByOpenInviteTrueAndStatusOrderByCreatedAtDesc(BookingStatus status);
    long countBySlotIdAndStatus(Long slotId, BookingStatus status);
}
