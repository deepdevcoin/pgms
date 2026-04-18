package com.pgms.backend.dto.manager;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ManagerResponse {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String designation;
    private boolean active;
    private boolean firstLogin;
    private List<Long> pgIds;
    private List<String> assignedPgs;
}
