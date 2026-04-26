package com.pgms.backend.dto.complaint;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ComplaintCommentRequest {
    @NotBlank(message = "Comment is required")
    private String message;
}
