package com.pgms.backend.dto.payment;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PaymentOverviewResponse {
    private PaymentSummaryResponse summary;
    private List<RentRecordResponse> records;
    private List<PaymentTransactionResponse> transactions;
}
