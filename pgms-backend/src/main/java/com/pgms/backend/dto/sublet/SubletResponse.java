package com.pgms.backend.dto.sublet;

import com.pgms.backend.entity.enums.SubletStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class SubletResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private SubletStatus status;
    private String guestName;
    private String guestPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
}
