package com.pgms.backend.util;

import com.pgms.backend.entity.enums.Role;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication instanceof UsernamePasswordAuthenticationToken)) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentUserContext currentUser) {
            return currentUser.getUserId();
        }
        return null;
    }

    public static Role getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication instanceof UsernamePasswordAuthenticationToken)) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentUserContext currentUser) {
            return currentUser.getRole();
        }
        return null;
    }
}
