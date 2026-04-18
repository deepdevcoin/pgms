package com.pgms.backend.service;

import com.pgms.backend.entity.ManagerProfile;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.ForbiddenException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.ManagerProfileRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.util.SecurityUtils;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AccessControlService {

    private final ManagerProfileRepository managerProfileRepository;
    private final TenantProfileRepository tenantProfileRepository;

    public AccessControlService(ManagerProfileRepository managerProfileRepository,
                                TenantProfileRepository tenantProfileRepository) {
        this.managerProfileRepository = managerProfileRepository;
        this.tenantProfileRepository = tenantProfileRepository;
    }

    public List<Long> getAssignedPgIdsForCurrentManager() {
        Long userId = SecurityUtils.getCurrentUserId();
        ManagerProfile profile = managerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Manager profile not found"));
        if (profile.getPgIds() == null || profile.getPgIds().isBlank()) {
            return Collections.emptyList();
        }
        return List.of(profile.getPgIds().split(",")).stream()
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .collect(Collectors.toList());
    }

    public Long getPrimaryPgIdForCurrentManager() {
        List<Long> pgIds = getAssignedPgIdsForCurrentManager();
        if (pgIds.isEmpty()) {
            throw new ForbiddenException("Manager is not assigned to any PG");
        }
        return pgIds.get(0);
    }

    public void ensureManagerAssignedToPg(Long pgId) {
        if (!getAssignedPgIdsForCurrentManager().contains(pgId)) {
            throw new ForbiddenException("Manager is not assigned to this PG");
        }
    }

    public TenantProfile getCurrentTenantProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        return tenantProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Tenant profile not found"));
    }

    public void ensureRole(Role expected) {
        if (!Objects.equals(SecurityUtils.getCurrentUserRole(), expected)) {
            throw new ForbiddenException("Insufficient role");
        }
    }
}
