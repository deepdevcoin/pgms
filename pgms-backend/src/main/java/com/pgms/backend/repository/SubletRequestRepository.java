package com.pgms.backend.repository;

import com.pgms.backend.entity.SubletRequest;
import com.pgms.backend.entity.enums.SubletStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubletRequestRepository extends JpaRepository<SubletRequest, Long> {
    List<SubletRequest> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<SubletRequest> findByTenantProfilePgIdOrderByCreatedAtDesc(Long pgId);
    long countByStatus(SubletStatus status);
}
