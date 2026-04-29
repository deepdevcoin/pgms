package com.pgms.backend.dto.notice;

import com.pgms.backend.entity.enums.NoticeTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NoticeCreateRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 120, message = "Title must be between 3 and 120 characters")
    private String title;
    @NotBlank(message = "Content is required")
    @Size(min = 5, max = 5000, message = "Content must be between 5 and 5000 characters")
    private String content;
    @NotNull(message = "Target type is required")
    private NoticeTargetType targetType;
    private Long targetPgId;
    private Long targetUserId;
    private LocalDateTime scheduledAt;
}
