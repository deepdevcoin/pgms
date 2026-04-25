package com.pgms.backend.controller;

import com.pgms.backend.dto.BaseResponse;
import com.pgms.backend.dto.notice.NoticeCreateRequest;
import com.pgms.backend.dto.notice.NoticeReadReceiptResponse;
import com.pgms.backend.dto.notice.NoticeResponse;
import com.pgms.backend.service.NoticeService;
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
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping
    public BaseResponse<List<NoticeResponse>> getNotices() {
        return BaseResponse.success("Notices fetched successfully", noticeService.getRelevantNotices());
    }

    @GetMapping("/owner")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<NoticeResponse>> getOwnerNotices() {
        return BaseResponse.success("Notices fetched successfully", noticeService.getRelevantNotices());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public BaseResponse<NoticeResponse> createNotice(@Valid @RequestBody NoticeCreateRequest request) {
        return BaseResponse.success("Notice created successfully", noticeService.publishNotice(request));
    }

    @PostMapping("/owner")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<NoticeResponse> createOwnerNotice(@Valid @RequestBody NoticeCreateRequest request) {
        return BaseResponse.success("Notice created successfully", noticeService.publishNotice(request));
    }

    @PutMapping("/{id}/read")
    public BaseResponse<Void> markRead(@PathVariable Long id) {
        noticeService.markRead(id);
        return BaseResponse.success("Notice marked as read", null);
    }

    @PutMapping("/owner/{id}/read")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<Void> markOwnerRead(@PathVariable Long id) {
        noticeService.markRead(id);
        return BaseResponse.success("Notice marked as read", null);
    }

    @GetMapping("/{id}/receipts")
    public BaseResponse<List<NoticeReadReceiptResponse>> receipts(@PathVariable Long id) {
        return BaseResponse.success("Notice read receipts fetched successfully", noticeService.getReadReceipts(id));
    }

    @GetMapping("/owner/{id}/receipts")
    @PreAuthorize("hasRole('OWNER')")
    public BaseResponse<List<NoticeReadReceiptResponse>> ownerReceipts(@PathVariable Long id) {
        return BaseResponse.success("Notice read receipts fetched successfully", noticeService.getReadReceipts(id));
    }
}
