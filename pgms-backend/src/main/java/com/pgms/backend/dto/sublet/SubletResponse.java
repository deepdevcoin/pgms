package com.pgms.backend.dto.sublet;

import com.pgms.backend.entity.enums.SubletStatus;
import com.pgms.backend.entity.enums.SubletGuestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class SubletResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private Long pgId;
    private String pgName;
    private String roomNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private SubletStatus status;
    private String guestName;
    private String guestPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Long subletGuestId;
    private SubletGuestStatus guestRecordStatus;
}
