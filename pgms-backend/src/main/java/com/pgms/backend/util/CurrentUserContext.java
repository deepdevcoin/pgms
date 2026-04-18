package com.pgms.backend.util;

import com.pgms.backend.entity.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CurrentUserContext {
    private Long userId;
    private Role role;
}
