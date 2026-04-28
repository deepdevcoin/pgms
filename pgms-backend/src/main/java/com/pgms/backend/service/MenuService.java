package com.pgms.backend.service;

import com.pgms.backend.dto.menu.MenuItemRequest;
import com.pgms.backend.dto.menu.MenuItemResponse;
import com.pgms.backend.entity.MenuItem;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.ForbiddenException;
import com.pgms.backend.repository.MenuItemRepository;
import com.pgms.backend.util.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class MenuService {
    private static final String CURRENT_MENU_LABEL = "CURRENT";

    private final MenuItemRepository menuItemRepository;
    private final PgService pgService;
    private final AccessControlService accessControlService;

    public MenuService(MenuItemRepository menuItemRepository, PgService pgService, AccessControlService accessControlService) {
        this.menuItemRepository = menuItemRepository;
        this.pgService = pgService;
        this.accessControlService = accessControlService;
    }

    public List<MenuItemResponse> getMenu(Long pgId, String weekLabel) {
        validateReadAccess(pgId);
        String normalizedWeek = normalizeWeekLabel(weekLabel);
        List<MenuItem> items = menuItemRepository.findByPgIdAndWeekLabelOrderByDayOfWeekAscMealTypeAsc(pgId, normalizedWeek);
        if (items.isEmpty()) {
            List<MenuItem> available = menuItemRepository.findByPgIdOrderByWeekLabelDescDayOfWeekAscMealTypeAsc(pgId);
            if (!available.isEmpty()) {
                String fallbackWeek = available.get(0).getWeekLabel();
                items = available.stream()
                        .filter(item -> fallbackWeek.equals(item.getWeekLabel()))
                        .toList();
            }
        }
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<MenuItemResponse> upsertMenu(List<MenuItemRequest> requests) {
        if (requests.isEmpty()) {
            throw new BadRequestException("At least one menu item is required");
        }
        Long pgId = requests.get(0).getPgId();
        String weekLabel = CURRENT_MENU_LABEL;
        validateWriteAccess(pgId);

        boolean inconsistentPayload = requests.stream().anyMatch(request ->
                !Objects.equals(request.getPgId(), pgId)
        );
        if (inconsistentPayload) {
            throw new BadRequestException("All menu items must belong to the same PG");
        }

        boolean duplicateMeals = requests.stream()
                .map(request -> request.getDayOfWeek() + "-" + request.getMealType())
                .distinct()
                .count() != requests.size();
        if (duplicateMeals) {
            throw new BadRequestException("Each day and meal can only be saved once per week");
        }

        menuItemRepository.deleteByPgIdAndWeekLabel(pgId, weekLabel);
        return requests.stream()
                .map(request -> menuItemRepository.save(MenuItem.builder()
                        .pg(pgService.getPgOrThrow(request.getPgId()))
                        .weekLabel(weekLabel)
                        .dayOfWeek(request.getDayOfWeek())
                        .mealType(request.getMealType())
                        .itemNames(request.getItemNames().trim())
                        .isVeg(request.getIsVeg())
                        .build()))
                .map(this::toResponse)
                .toList();
    }

    private void validateReadAccess(Long pgId) {
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (currentRole == null) {
            return;
        }
        if (currentRole == Role.MANAGER) {
            accessControlService.ensureManagerAssignedToPg(pgId);
            return;
        }
        if (currentRole == Role.TENANT) {
            TenantProfile tenantProfile = accessControlService.getCurrentTenantProfile();
            if (!Objects.equals(tenantProfile.getPg().getId(), pgId)) {
                throw new ForbiddenException("Tenant can only view menu for their own PG");
            }
        }
    }

    private void validateWriteAccess(Long pgId) {
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (currentRole != Role.MANAGER) {
            throw new ForbiddenException("Only managers can update menus");
        }
        accessControlService.ensureManagerAssignedToPg(pgId);
    }

    private String normalizeWeekLabel(String weekLabel) {
        if (weekLabel == null || weekLabel.isBlank()) {
            return CURRENT_MENU_LABEL;
        }
        return weekLabel.trim();
    }

    private MenuItemResponse toResponse(MenuItem item) {
        return MenuItemResponse.builder()
                .id(item.getId())
                .pgId(item.getPg().getId())
                .weekLabel(item.getWeekLabel())
                .dayOfWeek(item.getDayOfWeek())
                .mealType(item.getMealType())
                .itemNames(item.getItemNames())
                .isVeg(item.getIsVeg())
                .build();
    }
}
