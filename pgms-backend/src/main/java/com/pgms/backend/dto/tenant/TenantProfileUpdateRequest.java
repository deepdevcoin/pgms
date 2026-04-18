package com.pgms.backend.dto.tenant;

import lombok.Data;

@Data
public class TenantProfileUpdateRequest {
    private String kycDocType;
    private String kycDocPath;
}
