package com.pgms.backend.dto.tenant;

import com.pgms.backend.entity.enums.KycStatus;
import com.pgms.backend.entity.enums.TenantStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TenantResponse {
    private Long tenantProfileId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private Long pgId;
    private String pgName;
    private Long roomId;
    private String roomNumber;
    private LocalDate joiningDate;
    private Double advanceAmountPaid;
    private String kycDocType;
    private String kycDocPath;
    private KycStatus kycStatus;
    private LocalDateTime kycSubmittedAt;
    private LocalDateTime kycVerifiedAt;
    private String kycVerifiedByName;
    private String kycReplacementNotes;
    private LocalDateTime kycReplacementRequestedAt;
    private String kycReplacementRequestedByName;
    private Double creditWalletBalance;
    private TenantStatus status;
    private Boolean isActive;
}
