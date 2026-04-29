package com.pgms.backend.repository;

import com.pgms.backend.entity.NoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeReadRepository extends JpaRepository<NoticeRead, Long> {
    Optional<NoticeRead> findByNoticeIdAndUserId(Long noticeId, Long userId);
    List<NoticeRead> findByNoticeId(Long noticeId);
    List<NoticeRead> findByNoticeIdOrderByReadAtDesc(Long noticeId);
    void deleteByNoticeId(Long noticeId);
}
