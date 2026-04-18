package com.pgms.backend.repository;

import com.pgms.backend.entity.Notice;
import com.pgms.backend.entity.enums.NoticeTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType targetType);
    List<Notice> findByTargetPgIdOrderByCreatedAtDesc(Long pgId);
    List<Notice> findByTargetUserIdOrderByCreatedAtDesc(Long userId);
}
