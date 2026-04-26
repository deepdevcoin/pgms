package com.pgms.backend.repository;

import com.pgms.backend.entity.ComplaintActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintActivityRepository extends JpaRepository<ComplaintActivity, Long> {
    List<ComplaintActivity> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
    long countByComplaintId(Long complaintId);
}
