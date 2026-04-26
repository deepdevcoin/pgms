package com.pgms.backend.dto.sublet;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SubletCheckoutResponse {
    private SubletResponse sublet;
    private Double walletCreditApplied;
}
