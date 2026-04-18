package com.pgms.backend.repository;

import com.pgms.backend.entity.ManagerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ManagerProfileRepository extends JpaRepository<ManagerProfile, Long> {
    Optional<ManagerProfile> findByUserId(Long userId);
}
