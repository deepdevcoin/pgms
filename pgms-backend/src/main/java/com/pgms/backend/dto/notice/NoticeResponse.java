package com.pgms.backend.dto.notice;

import com.pgms.backend.entity.enums.NoticeTargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NoticeResponse {
    private Long id;
    private String title;
    private String content;
    private NoticeTargetType targetType;
    private Long targetPgId;
    private Long targetUserId;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private boolean read;
    private int readCount;
}
