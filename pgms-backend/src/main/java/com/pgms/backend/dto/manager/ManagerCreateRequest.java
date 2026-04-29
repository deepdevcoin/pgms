package com.pgms.backend.dto.manager;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ManagerCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;
    @NotBlank(message = "Phone is required")
    private String phone;
    private List<Long> pgIds;
}
