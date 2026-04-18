package com.pgms.backend.dto.menu;

import com.pgms.backend.entity.enums.MealType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.DayOfWeek;

@Data
public class MenuItemRequest {
    @NotNull(message = "pgId is required")
    private Long pgId;
    @NotBlank(message = "weekLabel is required")
    private String weekLabel;
    @NotNull(message = "dayOfWeek is required")
    private DayOfWeek dayOfWeek;
    @NotNull(message = "mealType is required")
    private MealType mealType;
    @NotBlank(message = "itemNames is required")
    private String itemNames;
    @NotNull(message = "isVeg is required")
    private Boolean isVeg;
}
