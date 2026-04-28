package com.pgms.backend.dto.payment;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class WalletCreditEntryResponse {
    private Long subletRequestId;
    private String roomNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Long occupiedDays;
    private Double roomMonthlyRent;
    private Double creditedAmount;
    private LocalDateTime creditedAt;
    private String note;
}
