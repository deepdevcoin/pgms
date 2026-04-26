package com.pgms.backend.repository;

import com.pgms.backend.entity.SubletGuest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubletGuestRepository extends JpaRepository<SubletGuest, Long> {
    Optional<SubletGuest> findBySubletRequestId(Long subletRequestId);
}
