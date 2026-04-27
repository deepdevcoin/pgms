package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.layout.LayoutPgResponse;
import com.pgms.backend.dto.layout.LayoutResponse;
import com.pgms.backend.dto.pg.RoomCleaningStatusUpdateRequest;
import com.pgms.backend.dto.pg.RoomResponse;
import com.pgms.backend.dto.pg.RoomUpdateRequest;
import jakarta.validation.Valid;
import com.pgms.backend.service.PgService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
public class ManagerRoomController {

    private final PgService pgService;

    public ManagerRoomController(PgService pgService) {
        this.pgService = pgService;
    }

    @PutMapping("/rooms/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<RoomResponse> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomUpdateRequest request) {
        return BaseResponse.success("Room updated successfully", pgService.updateRoom(id, request));
    }

    @GetMapping("/pgs")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<LayoutPgResponse>> getAssignedPgs() {
        return BaseResponse.success("Assigned PGs fetched successfully", pgService.getAssignedPgsForCurrentManager());
    }

    @GetMapping("/pgs/{pgId}/layout")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<LayoutResponse> getLayout(@PathVariable Long pgId) {
        return BaseResponse.success("Layout fetched successfully", pgService.getLayoutForManagerPg(pgId));
    }

    @PutMapping("/rooms/{id}/cleaning-status")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<RoomResponse> updateCleaningStatus(@PathVariable Long id,
                                                           @Valid @RequestBody RoomCleaningStatusUpdateRequest request) {
        return BaseResponse.success("Cleaning status updated successfully", pgService.updateCleaningStatus(id, request));
    }
}
