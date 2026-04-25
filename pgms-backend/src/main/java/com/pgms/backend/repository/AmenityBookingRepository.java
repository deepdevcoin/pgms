package com.pgms.backend.repository;

import com.pgms.backend.entity.AmenityBooking;
import com.pgms.backend.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AmenityBookingRepository extends JpaRepository<AmenityBooking, Long> {
    List<AmenityBooking> findBySlotPgIdOrderByCreatedAtDesc(Long pgId);
    List<AmenityBooking> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<AmenityBooking> findByTenantProfileIdAndStatusOrderByCreatedAtDesc(Long tenantProfileId, BookingStatus status);
    List<AmenityBooking> findByOpenInviteTrueAndStatusOrderByCreatedAtDesc(BookingStatus status);
    long countBySlotIdAndStatus(Long slotId, BookingStatus status);
    Optional<AmenityBooking> findBySlotIdAndTenantProfileIdAndStatus(Long slotId, Long tenantProfileId, BookingStatus status);
    Optional<AmenityBooking> findFirstBySlotIdAndOpenInviteTrueAndStatusOrderByCreatedAtAsc(Long slotId, BookingStatus status);
    Optional<AmenityBooking> findFirstBySlotIdAndStatusOrderByCreatedAtAsc(Long slotId, BookingStatus status);
    List<AmenityBooking> findBySlotIdAndStatusOrderByCreatedAtAsc(Long slotId, BookingStatus status);
}
