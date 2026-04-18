package com.pgms.backend.repository;

import com.pgms.backend.entity.Pg;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PgRepository extends JpaRepository<Pg, Long> {
}
