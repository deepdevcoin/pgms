package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.tenant.KycReplacementRequest;
import com.pgms.backend.dto.tenant.TenantResponse;
import com.pgms.backend.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api")
public class KycController {

    private final TenantService tenantService;

    public KycController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping("/tenant/kyc")
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<TenantResponse> currentTenantKyc() {
        return BaseResponse.success("Tenant KYC fetched successfully", tenantService.getCurrentTenantProfile());
    }

    @PostMapping(value = "/tenant/kyc/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TENANT')")
    public BaseResponse<TenantResponse> uploadCurrentTenantKyc(@RequestParam("docType") String docType,
                                                               @RequestParam("file") MultipartFile file) {
        return BaseResponse.success("KYC document uploaded successfully", tenantService.uploadCurrentTenantKyc(docType, file));
    }

    @GetMapping("/tenant/kyc/document")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<Resource> downloadCurrentTenantKyc() throws IOException {
        return buildFileResponse(tenantService.getCurrentTenantKycDocumentPath());
    }

    @GetMapping("/manager/kyc")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<List<TenantResponse>> managerKycQueue() {
        return BaseResponse.success("Tenant KYC queue fetched successfully", tenantService.getKycForCurrentManager());
    }

    @PutMapping("/manager/kyc/{id}/verify")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<TenantResponse> verifyTenantKyc(@PathVariable Long id) {
        return BaseResponse.success("Tenant KYC verified successfully", tenantService.verifyTenantKyc(id));
    }

    @PutMapping("/manager/kyc/{id}/request-replacement")
    @PreAuthorize("hasRole('MANAGER')")
    public BaseResponse<TenantResponse> requestTenantKycReplacement(@PathVariable Long id,
                                                                    @Valid @org.springframework.web.bind.annotation.RequestBody KycReplacementRequest request) {
        return BaseResponse.success("KYC replacement requested successfully", tenantService.requestTenantKycReplacement(id, request.getNotes()));
    }

    @GetMapping("/manager/kyc/{id}/document")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Resource> downloadTenantKycForManager(@PathVariable Long id) throws IOException {
        return buildFileResponse(tenantService.getManagerTenantKycDocumentPath(id));
    }

    private ResponseEntity<Resource> buildFileResponse(Path path) throws IOException {
        String contentType = Files.probeContentType(path);
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + path.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
