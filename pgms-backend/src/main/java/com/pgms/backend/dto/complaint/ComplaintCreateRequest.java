package com.pgms.backend.dto.complaint;

import com.pgms.backend.entity.enums.ComplaintCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComplaintCreateRequest {
    @NotNull(message = "Category is required")
    private ComplaintCategory category;
    @NotBlank(message = "Description is required")
    private String description;
    private String attachmentPath;
}
