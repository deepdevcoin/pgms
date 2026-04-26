package com.pgms.backend.repository;

import com.pgms.backend.entity.Complaint;
import com.pgms.backend.entity.enums.ComplaintCategory;
import com.pgms.backend.entity.enums.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByTenantProfileUserIdOrderByCreatedAtDesc(Long userId);
    List<Complaint> findByTenantProfilePgIdAndCategoryNotOrderByCreatedAtDesc(Long pgId, ComplaintCategory category);
    List<Complaint> findByTenantProfilePgIdInAndCategoryNotOrderByCreatedAtDesc(List<Long> pgIds, ComplaintCategory category);
    List<Complaint> findByStatusOrCategoryOrderByCreatedAtDesc(ComplaintStatus status, ComplaintCategory category);
    List<Complaint> findAllByOrderByCreatedAtDesc();
    List<Complaint> findByStatusInAndUpdatedAtBefore(List<ComplaintStatus> statuses, LocalDateTime updatedAt);
    long countByStatus(ComplaintStatus status);
    long countByCategory(ComplaintCategory category);
}
