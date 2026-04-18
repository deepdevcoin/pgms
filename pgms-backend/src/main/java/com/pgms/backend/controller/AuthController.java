package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.auth.ChangePasswordRequest;
import com.pgms.backend.dto.auth.LoginRequest;
import com.pgms.backend.dto.auth.LoginResponse;
import com.pgms.backend.dto.auth.ResetPasswordRequest;
import com.pgms.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public BaseResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return BaseResponse.success("Login successful", authService.login(request));
    }

    @PostMapping("/change-password")
    public BaseResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return BaseResponse.success("Password changed successfully", null);
    }

    @PostMapping("/reset-password")
    public BaseResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return BaseResponse.success("Password reset successfully", null);
    }
}
