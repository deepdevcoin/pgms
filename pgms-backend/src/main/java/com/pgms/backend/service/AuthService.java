package com.pgms.backend.service;

import com.pgms.backend.dto.auth.ChangePasswordRequest;
import com.pgms.backend.dto.auth.LoginRequest;
import com.pgms.backend.dto.auth.LoginResponse;
import com.pgms.backend.dto.auth.ResetPasswordRequest;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.exception.UnauthorizedException;
import com.pgms.backend.repository.UserRepository;
import com.pgms.backend.security.JwtUtil;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public static final String DEFAULT_OWNER_PASSWORD = "Admin@123";
    public static final String DEFAULT_USER_PASSWORD = "Temp@123";
    public static final String STRONG_PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (!user.isActive() || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        return LoginResponse.builder()
                .token(jwtUtil.generateToken(user))
                .role(user.getRole())
                .userId(user.getId())
                .name(user.getName())
                .isFirstLogin(user.isFirstLogin())
                .build();
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        ensureStrongPassword(request.getNewPassword());
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFirstLogin(false);
        userRepository.save(user);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new NotFoundException("No account found for that email"));
        ensureStrongPassword(request.getNewPassword());
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFirstLogin(false);
        userRepository.save(user);
    }

    @Transactional
    public User createSeedOwnerIfMissing() {
        User owner = userRepository.findByEmail("owner@pgms.com")
                .orElseGet(() -> User.builder()
                        .email("owner@pgms.com")
                        .build());

        owner.setName("StayMate Owner");
        owner.setPhone("9999999999");
        owner.setPasswordHash(passwordEncoder.encode(DEFAULT_OWNER_PASSWORD));
        owner.setRole(Role.OWNER);
        owner.setActive(true);
        owner.setFirstLogin(false);

        return userRepository.save(owner);
    }

    private void ensureStrongPassword(String password) {
        if (password == null || !password.matches(STRONG_PASSWORD_REGEX)) {
            throw new UnauthorizedException("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
        }
    }
}
