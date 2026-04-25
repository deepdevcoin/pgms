package com.pgms.backend.repository;

import com.pgms.backend.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByPgIdAndWeekLabelOrderByDayOfWeekAscMealTypeAsc(Long pgId, String weekLabel);
    List<MenuItem> findByPgIdOrderByWeekLabelDescDayOfWeekAscMealTypeAsc(Long pgId);
    void deleteByPgIdAndWeekLabel(Long pgId, String weekLabel);
}
