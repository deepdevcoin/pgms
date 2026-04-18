package com.pgms.backend.dto.tenant;

import com.pgms.backend.entity.enums.TenantStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class TenantResponse {
    private Long tenantProfileId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private Long pgId;
    private Long roomId;
    private String roomNumber;
    private LocalDate joiningDate;
    private Double advanceAmountPaid;
    private String kycDocType;
    private String kycDocPath;
    private Double creditWalletBalance;
    private TenantStatus status;
}
