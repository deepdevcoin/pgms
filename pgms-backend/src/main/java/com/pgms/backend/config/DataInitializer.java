package com.pgms.backend.config;

import com.pgms.backend.entity.ManagerProfile;
import com.pgms.backend.entity.AmenitySlot;
import com.pgms.backend.entity.MenuItem;
import com.pgms.backend.entity.PaymentTransaction;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.RentRecord;
import com.pgms.backend.entity.Room;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.AmenityType;
import com.pgms.backend.entity.enums.CleaningStatus;
import com.pgms.backend.entity.enums.MealType;
import com.pgms.backend.entity.enums.PaymentMethod;
import com.pgms.backend.entity.enums.PaymentTransactionType;
import com.pgms.backend.entity.enums.RentStatus;
import com.pgms.backend.entity.enums.RoomStatus;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.entity.enums.SharingType;
import com.pgms.backend.entity.enums.TenantStatus;
import com.pgms.backend.repository.AmenitySlotRepository;
import com.pgms.backend.repository.ManagerProfileRepository;
import com.pgms.backend.repository.MenuItemRepository;
import com.pgms.backend.repository.PaymentTransactionRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.RentRecordRepository;
import com.pgms.backend.repository.RoomRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.UserRepository;
import com.pgms.backend.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class DataInitializer {

    private static final String SAMPLE_PG_NAME = "Green Valley PG";
    private static final String SAMPLE_PG_ADDRESS = "12 Residency Road, Chennai";

    @Bean
    CommandLineRunner seedData(AuthService authService,
                               PgRepository pgRepository,
                               RoomRepository roomRepository,
                               AmenitySlotRepository amenitySlotRepository,
                               MenuItemRepository menuItemRepository,
                               PaymentTransactionRepository paymentTransactionRepository,
                               JdbcTemplate jdbcTemplate,
                               UserRepository userRepository,
                               ManagerProfileRepository managerProfileRepository,
                               TenantProfileRepository tenantProfileRepository,
                               RentRecordRepository rentRecordRepository,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            authService.createSeedOwnerIfMissing();
            syncRoomStatusEnumIfNeeded(jdbcTemplate);
            Pg seededPg = resolveOrCreateSamplePg(pgRepository);
            if (seededPg != null) {
                seedSampleRoomsIfMissing(seededPg, roomRepository);
                seedManagerAndTenantIfMissing(seededPg, roomRepository, userRepository, managerProfileRepository, tenantProfileRepository, rentRecordRepository, paymentTransactionRepository, passwordEncoder);
                seedAmenitySlotsIfMissing(seededPg, amenitySlotRepository);
            }

            if (menuItemRepository.count() == 0) {
                Pg pg = seededPg != null ? seededPg : pgRepository.findAll().stream().findFirst().orElse(null);
                if (pg != null) {
                    menuItemRepository.saveAll(createSampleMenu(pg));
                }
            }
        };
    }

    private void seedManagerAndTenantIfMissing(Pg pg,
                                               RoomRepository roomRepository,
                                               UserRepository userRepository,
                                               ManagerProfileRepository managerProfileRepository,
                                               TenantProfileRepository tenantProfileRepository,
                                               RentRecordRepository rentRecordRepository,
                                               PaymentTransactionRepository paymentTransactionRepository,
                                               PasswordEncoder passwordEncoder) {
        User managerCandidate = userRepository.findByEmail("manager@pgms.com")
                .orElseGet(() -> User.builder().email("manager@pgms.com").build());
        managerCandidate.setName("Seed Manager");
        managerCandidate.setPhone("9999999998");
        managerCandidate.setPasswordHash(passwordEncoder.encode(AuthService.DEFAULT_USER_PASSWORD));
        managerCandidate.setRole(Role.MANAGER);
        managerCandidate.setActive(true);
        managerCandidate.setFirstLogin(false);
        User manager = userRepository.save(managerCandidate);

        User finalManager = manager;
        ManagerProfile managerProfile = managerProfileRepository.findByUserId(manager.getId())
                .orElseGet(() -> ManagerProfile.builder().user(finalManager).build());
        managerProfile.setDesignation("Operations Manager");
        managerProfile.setPgIds(String.valueOf(pg.getId()));
        managerProfileRepository.save(managerProfile);

        User tenantCandidate = userRepository.findByEmail("tenant@pgms.com")
                .orElseGet(() -> User.builder().email("tenant@pgms.com").build());
        tenantCandidate.setName("Seed Tenant");
        tenantCandidate.setPhone("9999999997");
        tenantCandidate.setPasswordHash(passwordEncoder.encode(AuthService.DEFAULT_USER_PASSWORD));
        tenantCandidate.setRole(Role.TENANT);
        tenantCandidate.setActive(true);
        tenantCandidate.setFirstLogin(false);
        User tenant = userRepository.save(tenantCandidate);

        var existingTenantProfile = tenantProfileRepository.findByUserId(tenant.getId());
        Room tenantRoom = existingTenantProfile
                .map(profile -> roomRepository.findById(profile.getRoom().getId()).orElse(null))
                .orElseGet(() -> roomRepository.findByPgId(pg.getId()).stream()
                        .filter(room -> !"103".equals(room.getRoomNumber()))
                        .filter(room -> tenantProfileRepository.findByRoomId(room.getId()).isEmpty())
                        .findFirst()
                        .orElse(null));
        if (tenantRoom == null) return;

        if (tenantRoom.getStatus() != RoomStatus.OCCUPIED) {
            tenantRoom.setStatus(RoomStatus.OCCUPIED);
            tenantRoom.setCleaningStatus(CleaningStatus.CLEAN);
            tenantRoom = roomRepository.save(tenantRoom);
        }

        User finalTenant = tenant;
        Room finalTenantRoom = tenantRoom;
        TenantProfile tenantProfile = existingTenantProfile
                .orElseGet(() -> TenantProfile.builder().user(finalTenant).build());
        tenantProfile.setPg(pg);
        tenantProfile.setRoom(finalTenantRoom);
        tenantProfile.setJoiningDate(LocalDate.now().minusMonths(2));
        tenantProfile.setAdvanceAmountPaid(finalTenantRoom.getDepositAmount());
        tenantProfile.setStatus(TenantStatus.ACTIVE);
        if (tenantProfile.getCreditWalletBalance() == null) {
            tenantProfile.setCreditWalletBalance(0.0);
        }
        tenantProfile = tenantProfileRepository.save(tenantProfile);
        TenantProfile finalTenantProfile = tenantProfile;

        String billingMonth = YearMonth.now().toString();
        RentRecord rentRecord = rentRecordRepository.findByTenantProfileIdAndBillingMonth(finalTenantProfile.getId(), billingMonth)
                .orElseGet(() -> rentRecordRepository.save(RentRecord.builder()
                    .tenantProfile(finalTenantProfile)
                    .billingMonth(billingMonth)
                    .rentAmount(finalTenantRoom.getMonthlyRent())
                    .ebAmount(350.0)
                    .fineAccrued(150.0)
                    .amountPaid(0.0)
                    .totalDue(finalTenantRoom.getMonthlyRent() + 350.0 + 150.0)
                    .dueDate(LocalDate.now().withDayOfMonth(Math.min(pg.getPaymentDeadlineDay(), LocalDate.now().lengthOfMonth())))
                    .status(RentStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build()));
        seedPaymentTransactionIfMissing(rentRecord, paymentTransactionRepository);
    }

    private void seedPaymentTransactionIfMissing(RentRecord rentRecord, PaymentTransactionRepository paymentTransactionRepository) {
        if (paymentTransactionRepository.countByRentRecordId(rentRecord.getId()) > 0) {
            return;
        }
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .rentRecord(rentRecord)
                .tenantProfile(rentRecord.getTenantProfile())
                .transactionType(PaymentTransactionType.RENT_CHARGE)
                .paymentMethod(PaymentMethod.SYSTEM)
                .amount(rentRecord.getTotalDue())
                .signedAmount(rentRecord.getTotalDue())
                .outstandingBefore(0.0)
                .outstandingAfter(rentRecord.getTotalDue())
                .notes("Seeded rent charge")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void syncRoomStatusEnumIfNeeded(JdbcTemplate jdbcTemplate) {
        String columnType = jdbcTemplate.queryForObject(
                "SHOW COLUMNS FROM rooms LIKE 'status'",
                (rs, rowNum) -> rs.getString("Type")
        );

        if (columnType != null && !columnType.contains("'MAINTENANCE'")) {
            jdbcTemplate.execute(
                    "ALTER TABLE rooms MODIFY COLUMN status " +
                            "ENUM('VACANT','OCCUPIED','SUBLETTING','VACATING','MAINTENANCE') NOT NULL"
            );
        }
    }

    private Pg resolveOrCreateSamplePg(PgRepository pgRepository) {
        if (pgRepository.count() == 0) {
            return pgRepository.save(Pg.builder()
                    .name(SAMPLE_PG_NAME)
                    .address(SAMPLE_PG_ADDRESS)
                    .totalFloors(3)
                    .totalRooms(10)
                    .paymentDeadlineDay(10)
                    .fineAmountPerDay(100)
                    .slaHours(48)
                    .build());
        }

        return pgRepository.findAll().stream()
                .filter(this::isSamplePg)
                .findFirst()
                .orElse(null);
    }

    private boolean isSamplePg(Pg pg) {
        return SAMPLE_PG_NAME.equals(pg.getName()) && SAMPLE_PG_ADDRESS.equals(pg.getAddress());
    }

    private void seedSampleRoomsIfMissing(Pg pg, RoomRepository roomRepository) {
        Set<String> existingRoomNumbers = roomRepository.findByPgId(pg.getId()).stream()
                .map(Room::getRoomNumber)
                .collect(Collectors.toSet());

        List<Room> missingRooms = createSampleRooms(pg).stream()
                .filter(room -> !existingRoomNumbers.contains(room.getRoomNumber()))
                .toList();

        if (!missingRooms.isEmpty()) {
            roomRepository.saveAll(missingRooms);
        }
    }

    private List<Room> createSampleRooms(Pg pg) {
        return List.of(
                room(pg, "101", 1, true, SharingType.SINGLE, 10000, 15000, RoomStatus.VACANT, CleaningStatus.CLEAN),
                room(pg, "102", 1, false, SharingType.DOUBLE, 8000, 12000, RoomStatus.VACANT, CleaningStatus.DIRTY),
                room(pg, "103", 1, false, SharingType.TRIPLE, 6500, 10000, RoomStatus.MAINTENANCE, CleaningStatus.IN_PROGRESS),
                room(pg, "104", 1, true, SharingType.DOUBLE, 8500, 12000, RoomStatus.VACANT, CleaningStatus.CLEAN),
                room(pg, "201", 2, true, SharingType.SINGLE, 11000, 15000, RoomStatus.VACANT, CleaningStatus.CLEAN),
                room(pg, "202", 2, false, SharingType.DOUBLE, 8200, 12000, RoomStatus.VACANT, CleaningStatus.DIRTY),
                room(pg, "203", 2, false, SharingType.TRIPLE, 6800, 10000, RoomStatus.VACANT, CleaningStatus.CLEAN),
                room(pg, "204", 2, true, SharingType.DOUBLE, 8700, 12000, RoomStatus.VACANT, CleaningStatus.IN_PROGRESS),
                room(pg, "301", 3, true, SharingType.SINGLE, 11500, 15000, RoomStatus.VACANT, CleaningStatus.CLEAN),
                room(pg, "302", 3, false, SharingType.DORM, 5500, 8000, RoomStatus.VACANT, CleaningStatus.DIRTY)
        );
    }

    private Room room(Pg pg, String roomNumber, int floor, boolean isAc, SharingType sharingType, double rent, double deposit, RoomStatus status, CleaningStatus cleaningStatus) {
        return Room.builder()
                .pg(pg)
                .roomNumber(roomNumber)
                .floor(floor)
                .isAC(isAc)
                .sharingType(sharingType)
                .monthlyRent(rent)
                .depositAmount(deposit)
                .status(status)
                .cleaningStatus(cleaningStatus)
                .build();
    }

    private void seedAmenitySlotsIfMissing(Pg pg, AmenitySlotRepository amenitySlotRepository) {
        List<AmenitySlot> existingSlots = amenitySlotRepository.findByPgIdOrderBySlotDateAscStartTimeAsc(pg.getId());
        backfillAmenityResourceNames(existingSlots, amenitySlotRepository);
        boolean hasUpcomingSlots = existingSlots.stream().anyMatch(slot -> !slot.getSlotDate().isBefore(LocalDate.now()));
        if (hasUpcomingSlots) {
            return;
        }
        List<AmenitySlot> slots = new ArrayList<>();
        addAmenityWindow(slots, pg, AmenityType.WASHING_MACHINE, LocalDate.now().plusDays(1), LocalTime.of(7, 0), LocalTime.of(9, 0), 2, "Laundry Room", "Machine");
        addAmenityWindow(slots, pg, AmenityType.TABLE_TENNIS, LocalDate.now().plusDays(1), LocalTime.of(19, 0), LocalTime.of(21, 0), 2, "Common Lounge", "Table");
        addAmenityWindow(slots, pg, AmenityType.BADMINTON, LocalDate.now().plusDays(2), LocalTime.of(18, 0), LocalTime.of(20, 0), 4, "Terrace Court", "Court");
        addAmenityWindow(slots, pg, AmenityType.CARROM, LocalDate.now().plusDays(2), LocalTime.of(20, 0), LocalTime.of(21, 30), 4, "Rec Room", "Board");
        amenitySlotRepository.saveAll(slots);
    }

    private void backfillAmenityResourceNames(List<AmenitySlot> existingSlots, AmenitySlotRepository amenitySlotRepository) {
        List<AmenitySlot> missing = existingSlots.stream()
                .filter(slot -> slot.getResourceName() == null || slot.getResourceName().isBlank())
                .toList();
        if (missing.isEmpty()) {
            return;
        }
        for (AmenitySlot slot : missing) {
            slot.setResourceName(defaultAmenityResourceName(slot.getAmenityType()));
        }
        amenitySlotRepository.saveAll(missing);
    }

    private void addAmenityWindow(List<AmenitySlot> slots, Pg pg, AmenityType amenityType, LocalDate date, LocalTime start, LocalTime end, int capacity, String facilityName, String resourceName) {
        LocalTime cursor = start;
        while (cursor.isBefore(end)) {
            LocalTime next = cursor.plusMinutes(30);
            if (next.isAfter(end)) {
                next = end;
            }
            if (amenityType == AmenityType.WASHING_MACHINE) {
                for (int unit = 1; unit <= capacity; unit++) {
                    slots.add(amenitySlot(pg, amenityType, date, cursor, next, 1, facilityName, resourceName + " " + unit));
                }
            } else {
                slots.add(amenitySlot(pg, amenityType, date, cursor, next, capacity, facilityName, resourceName));
            }
            cursor = next;
        }
    }

    private AmenitySlot amenitySlot(Pg pg, AmenityType amenityType, LocalDate date, int startHour, int startMinute, int endHour, int endMinute, int capacity, String facilityName, String resourceName) {
        return amenitySlot(pg, amenityType, date, LocalTime.of(startHour, startMinute), LocalTime.of(endHour, endMinute), capacity, facilityName, resourceName);
    }

    private AmenitySlot amenitySlot(Pg pg, AmenityType amenityType, LocalDate date, LocalTime startTime, LocalTime endTime, int capacity, String facilityName, String resourceName) {
        return AmenitySlot.builder()
                .pg(pg)
                .amenityType(amenityType)
                .slotDate(date)
                .startTime(startTime)
                .endTime(endTime)
                .capacity(capacity)
                .facilityName(facilityName)
                .resourceName(resourceName)
                .build();
    }

    private String defaultAmenityResourceName(AmenityType amenityType) {
        return switch (amenityType) {
            case WASHING_MACHINE -> "Machine";
            case TABLE_TENNIS -> "Table";
            case BADMINTON -> "Court";
            case CARROM -> "Board";
        };
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
