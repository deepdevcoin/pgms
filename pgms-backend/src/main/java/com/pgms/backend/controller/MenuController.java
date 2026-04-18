package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.menu.MenuItemRequest;
import com.pgms.backend.dto.menu.MenuItemResponse;
import com.pgms.backend.service.MenuService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public BaseResponse<List<MenuItemResponse>> getMenu(@RequestParam Long pgId, @RequestParam String weekLabel) {
        return BaseResponse.success("Menu fetched successfully", menuService.getMenu(pgId, weekLabel));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public BaseResponse<List<MenuItemResponse>> upsert(@Valid @RequestBody List<MenuItemRequest> requests) {
        return BaseResponse.success("Menu saved successfully", menuService.upsertMenu(requests));
    }
}
