package com.pgms.backend.dto.complaint;

import com.pgms.backend.entity.enums.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComplaintStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private ComplaintStatus status;
    private String notes;
}
