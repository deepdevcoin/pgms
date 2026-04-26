package com.pgms.backend.repository;

import com.pgms.backend.entity.ServiceBooking;
import com.pgms.backend.entity.enums.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceBookingRepository extends JpaRepository<ServiceBooking, Long> {
    List<ServiceBooking> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<ServiceBooking> findByTenantProfilePgIdOrderByCreatedAtDesc(Long pgId);
    List<ServiceBooking> findByTenantProfilePgIdInOrderByCreatedAtDesc(List<Long> pgIds);
    List<ServiceBooking> findByTenantProfileIdAndStatusInOrderByCreatedAtDesc(Long tenantProfileId, List<ServiceStatus> statuses);
    long countByTenantProfilePgIdAndStatus(Long pgId, ServiceStatus status);
    long countByTenantProfilePgIdInAndStatusIn(List<Long> pgIds, List<ServiceStatus> statuses);
}
