package com.pgms.backend.dto.vacate;

import com.pgms.backend.entity.enums.VacateStatus;
import com.pgms.backend.entity.enums.VacateType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class VacateNoticeResponse {
    private Long id;
    private Long tenantProfileId;
    private String tenantName;
    private String roomNumber;
    private LocalDate intendedVacateDate;
    private VacateType noticeType;
    private VacateStatus status;
    private Boolean refundEligible;
    private Double advanceRefundAmount;
    private String referralName;
    private String referralPhone;
    private String referralEmail;
    private String managerMessage;
}
