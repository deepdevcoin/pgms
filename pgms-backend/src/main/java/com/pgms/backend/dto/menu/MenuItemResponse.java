package com.pgms.backend.dto.menu;

import com.pgms.backend.entity.enums.MealType;
import lombok.Builder;
import lombok.Data;

import java.time.DayOfWeek;

@Data
@Builder
public class MenuItemResponse {
    private Long id;
    private Long pgId;
    private String weekLabel;
    private DayOfWeek dayOfWeek;
    private MealType mealType;
    private String itemNames;
    private Boolean isVeg;
}
