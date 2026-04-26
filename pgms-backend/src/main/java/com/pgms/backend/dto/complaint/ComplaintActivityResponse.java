package com.pgms.backend.dto.complaint;

import com.pgms.backend.entity.enums.ComplaintActivityType;
import com.pgms.backend.entity.enums.ComplaintStatus;
import com.pgms.backend.entity.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ComplaintActivityResponse {
    private Long id;
    private ComplaintActivityType activityType;
    private Role actorRole;
    private String actorName;
    private ComplaintStatus fromStatus;
    private ComplaintStatus toStatus;
    private String message;
    private LocalDateTime createdAt;
}
