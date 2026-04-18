package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.payment.ApplyCreditRequest;
import com.pgms.backend.dto.payment.CashPaymentRequest;
import com.pgms.backend.dto.payment.PayRentRequest;
import com.pgms.backend.dto.payment.RentRecordResponse;
import com.pgms.backend.dto.payment.WaiveFineRequest;
import com.pgms.backend.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/api/tenant/payments")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<List<RentRecordResponse>> tenantPayments() {
        return BaseResponse.success("Payments fetched successfully", paymentService.getTenantPayments());
    }

    @PostMapping("/api/tenant/payments/pay")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<RentRecordResponse> pay(@Valid @RequestBody PayRentRequest request) {
        return BaseResponse.success("Payment recorded successfully", paymentService.payByTenant(request.getRecordId(), request.getAmount()));
    }

    @PostMapping("/api/tenant/payments/apply-credit")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<RentRecordResponse> applyCredit(@Valid @RequestBody ApplyCreditRequest request) {
        return BaseResponse.success("Wallet credit applied successfully", paymentService.applyWalletCredit(request.getRentRecordId()));
    }

    @GetMapping("/api/manager/payments")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<RentRecordResponse>> managerPayments() {
        return BaseResponse.success("Payments fetched successfully", paymentService.getManagerPayments());
    }

    @PostMapping("/api/manager/payments/cash")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<RentRecordResponse> cashPayment(@Valid @RequestBody CashPaymentRequest request) {
        return BaseResponse.success("Cash payment recorded successfully", paymentService.recordCashPayment(request));
    }

    @PutMapping("/api/manager/payments/{id}/waive-fine")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<RentRecordResponse> waiveFine(@PathVariable Long id, @Valid @RequestBody WaiveFineRequest request) {
        return BaseResponse.success("Fine waived successfully", paymentService.waiveFine(id, request.getReason()));
    }
}
