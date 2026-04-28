package com.pgms.backend.repository;

import com.pgms.backend.entity.VacateNotice;
import com.pgms.backend.entity.enums.VacateStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VacateNoticeRepository extends JpaRepository<VacateNotice, Long> {
    Optional<VacateNotice> findFirstByTenantProfileUserIdAndStatusNotOrderByCreatedAtDesc(Long userId, VacateStatus status);
    Optional<VacateNotice> findFirstByTenantProfileIdAndStatusInOrderByCreatedAtDesc(Long tenantProfileId, List<VacateStatus> statuses);
    List<VacateNotice> findByTenantProfilePgId(Long pgId);
    List<VacateNotice> findByStatus(VacateStatus status);
}
