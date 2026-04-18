package com.pgms.backend.dto.notice;

import com.pgms.backend.entity.enums.NoticeTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NoticeCreateRequest {
    @NotBlank(message = "Title is required")
    private String title;
    @NotBlank(message = "Content is required")
    private String content;
    @NotNull(message = "Target type is required")
    private NoticeTargetType targetType;
    private Long targetPgId;
    private Long targetUserId;
}
