package com.pgms.backend.config;

import com.pgms.backend.entity.MenuItem;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.enums.MealType;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.SharingType;
import com.pgms.backend.repository.MenuItemRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(AuthService authService,
                               PgRepository pgRepository,
                               RoomRepository roomRepository,
                               MenuItemRepository menuItemRepository) {
        return args -> {
            authService.createSeedOwnerIfMissing();
            Pg seededPg = null;
            if (pgRepository.count() == 0) {
                seededPg = pgRepository.save(Pg.builder()
                        .name("Green Valley PG")
                        .address("12 Residency Road, Chennai")
                        .totalFloors(3)
                        .totalRooms(10)
                        .paymentDeadlineDay(10)
                        .fineAmountPerDay(100)
                        .slaHours(48)
                        .build());
                List<Room> rooms = List.of(
                        room(seededPg, "101", 1, true, SharingType.SINGLE, 10000, 15000, RoomStatus.VACANT),
                        room(seededPg, "102", 1, false, SharingType.DOUBLE, 8000, 12000, RoomStatus.VACANT),
                        room(seededPg, "103", 1, false, SharingType.TRIPLE, 6500, 10000, RoomStatus.VACANT),
                        room(seededPg, "104", 1, true, SharingType.DOUBLE, 8500, 12000, RoomStatus.VACANT),
                        room(seededPg, "201", 2, true, SharingType.SINGLE, 11000, 15000, RoomStatus.VACANT),
                        room(seededPg, "202", 2, false, SharingType.DOUBLE, 8200, 12000, RoomStatus.VACANT),
                        room(seededPg, "203", 2, false, SharingType.TRIPLE, 6800, 10000, RoomStatus.VACANT),
                        room(seededPg, "204", 2, true, SharingType.DOUBLE, 8700, 12000, RoomStatus.VACANT),
                        room(seededPg, "301", 3, true, SharingType.SINGLE, 11500, 15000, RoomStatus.VACANT),
                        room(seededPg, "302", 3, false, SharingType.DORM, 5500, 8000, RoomStatus.VACANT)
                );
                roomRepository.saveAll(rooms);
            }

            if (menuItemRepository.count() == 0) {
                Pg pg = seededPg != null ? seededPg : pgRepository.findAll().stream().findFirst().orElse(null);
                if (pg != null) {
                    menuItemRepository.saveAll(createSampleMenu(pg));
                }
            }
        };
    }

    private Room room(Pg pg, String roomNumber, int floor, boolean isAc, SharingType sharingType, double rent, double deposit, RoomStatus status) {
        return Room.builder()
                .pg(pg)
                .roomNumber(roomNumber)
                .floor(floor)
                .isAC(isAc)
                .sharingType(sharingType)
                .monthlyRent(rent)
                .depositAmount(deposit)
                .status(status)
                .build();
    }

    private List<MenuItem> createSampleMenu(Pg pg) {
        String weekLabel = getCurrentIsoWeekLabel();
        return List.of(
                menu(pg, weekLabel, DayOfWeek.MONDAY, MealType.BREAKFAST, "Idli, Sambar, Chutney"),
                menu(pg, weekLabel, DayOfWeek.MONDAY, MealType.LUNCH, "Rice, Sambar, Potato Fry"),
                menu(pg, weekLabel, DayOfWeek.MONDAY, MealType.DINNER, "Chapati, Dal Tadka"),
                menu(pg, weekLabel, DayOfWeek.TUESDAY, MealType.BREAKFAST, "Pongal, Vada, Chutney"),
                menu(pg, weekLabel, DayOfWeek.TUESDAY, MealType.LUNCH, "Jeera Rice, Paneer Curry"),
                menu(pg, weekLabel, DayOfWeek.TUESDAY, MealType.DINNER, "Dosa, Tomato Kurma"),
                menu(pg, weekLabel, DayOfWeek.WEDNESDAY, MealType.BREAKFAST, "Poori, Masala"),
                menu(pg, weekLabel, DayOfWeek.WEDNESDAY, MealType.LUNCH, "Lemon Rice, Veg Kurma"),
                menu(pg, weekLabel, DayOfWeek.WEDNESDAY, MealType.DINNER, "Fried Rice, Gobi Manchurian"),
                menu(pg, weekLabel, DayOfWeek.THURSDAY, MealType.BREAKFAST, "Upma, Chutney, Banana"),
                menu(pg, weekLabel, DayOfWeek.THURSDAY, MealType.LUNCH, "Rice, Rasam, Beans Poriyal"),
                menu(pg, weekLabel, DayOfWeek.THURSDAY, MealType.DINNER, "Parotta, Salna"),
                menu(pg, weekLabel, DayOfWeek.FRIDAY, MealType.BREAKFAST, "Aloo Paratha, Curd"),
                menu(pg, weekLabel, DayOfWeek.FRIDAY, MealType.LUNCH, "Curd Rice, Beetroot Fry"),
                menu(pg, weekLabel, DayOfWeek.FRIDAY, MealType.DINNER, "Veg Pulao, Onion Raita"),
                menu(pg, weekLabel, DayOfWeek.SATURDAY, MealType.BREAKFAST, "Kesari, Mini Idli, Sambar"),
                menu(pg, weekLabel, DayOfWeek.SATURDAY, MealType.LUNCH, "Meals, Sambar, Poriyal"),
                menu(pg, weekLabel, DayOfWeek.SATURDAY, MealType.DINNER, "Chapati, Mixed Veg Curry"),
                menu(pg, weekLabel, DayOfWeek.SUNDAY, MealType.BREAKFAST, "Masala Dosa, Chutney"),
                menu(pg, weekLabel, DayOfWeek.SUNDAY, MealType.LUNCH, "Veg Biryani, Raitha"),
                menu(pg, weekLabel, DayOfWeek.SUNDAY, MealType.DINNER, "Tomato Rice, Cucumber Salad")
        );
    }

    private MenuItem menu(Pg pg, String weekLabel, DayOfWeek dayOfWeek, MealType mealType, String itemNames) {
        return MenuItem.builder()
                .pg(pg)
                .weekLabel(weekLabel)
                .dayOfWeek(dayOfWeek)
                .mealType(mealType)
                .itemNames(itemNames)
                .isVeg(true)
                .build();
    }

    private String getCurrentIsoWeekLabel() {
        LocalDate today = LocalDate.now();
        WeekFields weekFields = WeekFields.ISO;
        int week = today.get(weekFields.weekOfWeekBasedYear());
        int year = today.get(weekFields.weekBasedYear());
        return String.format("%d-W%02d", year, week);
    }
}
