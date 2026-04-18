package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.pg.RoomResponse;
import com.pgms.backend.dto.pg.RoomUpdateRequest;
import com.pgms.backend.service.PgService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/manager")
public class ManagerRoomController {

    private final PgService pgService;

    public ManagerRoomController(PgService pgService) {
        this.pgService = pgService;
    }

    @PutMapping("/rooms/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<RoomResponse> updateRoom(@PathVariable Long id, @RequestBody RoomUpdateRequest request) {
        return BaseResponse.success("Room updated successfully", pgService.updateRoom(id, request));
    }
}
