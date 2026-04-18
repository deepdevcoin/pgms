package com.pgms.backend.dto.layout;

import com.pgms.backend.entity.enums.TenantStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class LayoutTenantResponse {
    private Long tenantProfileId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private LocalDate joiningDate;
    private Double advanceAmountPaid;
    private Double depositRequired;
    private Double creditWalletBalance;
    private TenantStatus status;
    private LayoutTenantRentSummaryResponse rentSummary;
}
