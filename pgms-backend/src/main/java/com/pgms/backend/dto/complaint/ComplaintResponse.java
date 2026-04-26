package com.pgms.backend.dto.complaint;

import com.pgms.backend.entity.enums.ComplaintCategory;
import com.pgms.backend.entity.enums.ComplaintStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ComplaintResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private ComplaintCategory category;
    private String description;
    private String attachmentPath;
    private ComplaintStatus status;
    private String notes;
    private String latestActivitySummary;
    private Integer activityCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
