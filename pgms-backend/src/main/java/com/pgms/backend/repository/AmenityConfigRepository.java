package com.pgms.backend.repository;

import com.pgms.backend.entity.AmenityConfig;
import com.pgms.backend.entity.enums.AmenityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
public interface AmenityConfigRepository extends JpaRepository<AmenityConfig, Long> {
    List<AmenityConfig> findByPgIdInOrderByPgIdAscDisplayNameAscIdAsc(List<Long> pgIds);
    List<AmenityConfig> findByPgIdOrderByDisplayNameAscIdAsc(Long pgId);
    List<AmenityConfig> findByPgIdAndAmenityTypeOrderByDisplayNameAscIdAsc(Long pgId, AmenityType amenityType);
}
