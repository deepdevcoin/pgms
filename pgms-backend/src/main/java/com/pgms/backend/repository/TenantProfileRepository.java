package com.pgms.backend.repository;

import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantProfileRepository extends JpaRepository<TenantProfile, Long> {
    Optional<TenantProfile> findByUserId(Long userId);
    List<TenantProfile> findByPgId(Long pgId);
    Optional<TenantProfile> findByRoomId(Long roomId);
    List<TenantProfile> findByPgIdAndStatus(Long pgId, TenantStatus status);
    long countByStatus(TenantStatus status);
}
