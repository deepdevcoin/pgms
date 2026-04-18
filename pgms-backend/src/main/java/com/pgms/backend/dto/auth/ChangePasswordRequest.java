package com.pgms.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.pgms.backend.service.AuthService;

@Data
public class ChangePasswordRequest {
    @NotNull(message = "User id is required")
    private Long userId;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    @Pattern(
            regexp = AuthService.STRONG_PASSWORD_REGEX,
            message = "Password must include uppercase, lowercase, number, and special character"
    )
    private String newPassword;
}
