package com.pgms.backend.service;

import com.pgms.backend.dto.menu.MenuItemRequest;
import com.pgms.backend.dto.menu.MenuItemResponse;
import com.pgms.backend.entity.MenuItem;
import com.pgms.backend.repository.MenuItemRepository;
import com.pgms.backend.util.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MenuService {

    private final MenuItemRepository menuItemRepository;
    private final PgService pgService;
    private final AccessControlService accessControlService;

    public MenuService(MenuItemRepository menuItemRepository, PgService pgService, AccessControlService accessControlService) {
        this.menuItemRepository = menuItemRepository;
        this.pgService = pgService;
        this.accessControlService = accessControlService;
    }

    public List<MenuItemResponse> getMenu(Long pgId, String weekLabel) {
        return menuItemRepository.findByPgIdAndWeekLabelOrderByDayOfWeekAscMealTypeAsc(pgId, weekLabel).stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<MenuItemResponse> upsertMenu(List<MenuItemRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }
        Long pgId = requests.get(0).getPgId();
        String weekLabel = requests.get(0).getWeekLabel();
        if (SecurityUtils.getCurrentUserRole() != null && "MANAGER".equals(SecurityUtils.getCurrentUserRole().name())) {
            accessControlService.ensureManagerAssignedToPg(pgId);
        }
        menuItemRepository.deleteByPgIdAndWeekLabel(pgId, weekLabel);
        return requests.stream()
                .map(request -> menuItemRepository.save(MenuItem.builder()
                        .pg(pgService.getPgOrThrow(request.getPgId()))
                        .weekLabel(request.getWeekLabel())
                        .dayOfWeek(request.getDayOfWeek())
                        .mealType(request.getMealType())
                        .itemNames(request.getItemNames())
                        .isVeg(request.getIsVeg())
                        .build()))
                .map(this::toResponse)
                .toList();
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
