package com.pgms.backend.service;

import com.pgms.backend.dto.manager.ManagerCreateRequest;
import com.pgms.backend.dto.manager.ManagerResponse;
import com.pgms.backend.entity.ManagerProfile;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.ConflictException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ManagerProfileRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ManagerService {

    private final ManagerProfileRepository managerProfileRepository;
    private final UserRepository userRepository;
    private final PgRepository pgRepository;
    private final PasswordEncoder passwordEncoder;

    public ManagerService(ManagerProfileRepository managerProfileRepository,
                          UserRepository userRepository,
                          PgRepository pgRepository,
                          PasswordEncoder passwordEncoder) {
        this.managerProfileRepository = managerProfileRepository;
        this.userRepository = userRepository;
        this.pgRepository = pgRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ManagerResponse createManager(ManagerCreateRequest request) {
        validateUniqueUser(request.getEmail(), request.getPhone());
        User user = userRepository.save(User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(AuthService.DEFAULT_USER_PASSWORD))
                .role(Role.MANAGER)
                .isActive(true)
                .isFirstLogin(true)
                .build());
        ManagerProfile profile = managerProfileRepository.save(ManagerProfile.builder()
                .user(user)
                .designation(request.getDesignation())
                .pgIds(joinPgIds(request.getPgIds()))
                .build());
        return toResponse(profile);
    }

    public List<ManagerResponse> getAllManagers() {
        return managerProfileRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ManagerResponse assignPgs(Long managerId, List<Long> pgIds) {
        ManagerProfile profile = managerProfileRepository.findByUserId(managerId)
                .orElseThrow(() -> new NotFoundException("Manager not found"));
        profile.setPgIds(joinPgIds(pgIds));
        return toResponse(managerProfileRepository.save(profile));
    }

    @Transactional
    public void deactivateManager(Long managerId) {
        User user = getManagerUser(managerId);
        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional
    public void activateManager(Long managerId) {
        User user = getManagerUser(managerId);
        user.setActive(true);
        userRepository.save(user);
    }

    @Transactional
    public void deleteManagerPermanently(Long managerId) {
        ManagerProfile profile = managerProfileRepository.findByUserId(managerId)
                .orElseThrow(() -> new NotFoundException("Manager not found"));
        User user = getManagerUser(managerId);
        managerProfileRepository.delete(profile);
        userRepository.delete(user);
    }

    public List<Long> parsePgIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(csv.split(",")).stream().filter(value -> !value.isBlank()).map(Long::valueOf).toList();
    }

    public ManagerResponse toResponse(ManagerProfile profile) {
        User user = profile.getUser();
        List<Long> pgIds = parsePgIds(profile.getPgIds());
        List<String> pgNames = pgRepository.findAllById(pgIds).stream().map(Pg::getName).toList();
        return ManagerResponse.builder()
                .id(profile.getId())
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .designation(profile.getDesignation())
                .active(user.isActive())
                .firstLogin(user.isFirstLogin())
                .pgIds(pgIds)
                .assignedPgs(pgNames)
                .build();
    }

    private void validateUniqueUser(String email, String phone) {
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email already exists");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new ConflictException("Phone already exists");
        }
    }

    private String joinPgIds(List<Long> pgIds) {
        if (pgIds == null || pgIds.isEmpty()) {
            return "";
        }
        List<Pg> pgs = pgRepository.findAllById(pgIds);
        if (pgs.size() != pgIds.size()) {
            throw new NotFoundException("One or more PGs not found");
        }
        return pgIds.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private User getManagerUser(Long managerId) {
        User user = userRepository.findById(managerId)
                .orElseThrow(() -> new NotFoundException("Manager not found"));
        if (user.getRole() != Role.MANAGER) {
            throw new NotFoundException("Manager not found");
        }
        return user;
    }
}
