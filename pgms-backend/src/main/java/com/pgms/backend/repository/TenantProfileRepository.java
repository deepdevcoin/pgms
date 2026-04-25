package com.pgms.backend.repository;

import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantProfileRepository extends JpaRepository<TenantProfile, Long> {
    Optional<TenantProfile> findByUserId(Long userId);
    List<TenantProfile> findByPgId(Long pgId);
    List<TenantProfile> findByPgIdIn(List<Long> pgIds);
    List<TenantProfile> findByRoomId(Long roomId);
    List<TenantProfile> findByRoomIdAndStatusIn(Long roomId, List<TenantStatus> statuses);
    List<TenantProfile> findByPgIdAndStatus(Long pgId, TenantStatus status);
    long countByStatus(TenantStatus status);
}
