package com.pgms.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class WalletResponse {
    private Double creditWalletBalance;
    private List<WalletCreditEntryResponse> credits;
}
