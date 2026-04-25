package com.pgms.backend.dto.notice;

import com.pgms.backend.entity.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NoticeReadReceiptResponse {
    private Long userId;
    private String userName;
    private Role role;
    private LocalDateTime readAt;
}
