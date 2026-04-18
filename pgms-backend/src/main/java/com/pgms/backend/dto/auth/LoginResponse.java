package com.pgms.backend.dto.auth;

import com.pgms.backend.entity.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private Role role;
    private Long userId;
    private String name;
    private boolean isFirstLogin;
}
