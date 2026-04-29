package com.pgms.backend.service;

import com.pgms.backend.dto.notice.NoticeCreateRequest;
import com.pgms.backend.dto.notice.NoticeReadReceiptResponse;
import com.pgms.backend.dto.notice.NoticeResponse;
import com.pgms.backend.entity.Notice;
import com.pgms.backend.entity.NoticeRead;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.TenantProfile;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.NoticeTargetType;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.NoticeReadRepository;
import com.pgms.backend.repository.NoticeRepository;
import com.pgms.backend.repository.PgRepository;
import com.pgms.backend.repository.TenantProfileRepository;
import com.pgms.backend.repository.UserRepository;
import com.pgms.backend.util.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeReadRepository noticeReadRepository;
    private final UserRepository userRepository;
    private final PgRepository pgRepository;
    private final TenantProfileRepository tenantProfileRepository;
    private final AccessControlService accessControlService;

    public NoticeService(NoticeRepository noticeRepository,
                         NoticeReadRepository noticeReadRepository,
                         UserRepository userRepository,
                         PgRepository pgRepository,
                         TenantProfileRepository tenantProfileRepository,
                         AccessControlService accessControlService) {
        this.noticeRepository = noticeRepository;
        this.noticeReadRepository = noticeReadRepository;
        this.userRepository = userRepository;
        this.pgRepository = pgRepository;
        this.tenantProfileRepository = tenantProfileRepository;
        this.accessControlService = accessControlService;
    }

    public List<NoticeResponse> getRelevantNotices() {
        Long userId = SecurityUtils.getCurrentUserId();
        Role role = SecurityUtils.getCurrentUserRole();
        Map<Long, Notice> notices = new LinkedHashMap<>();
        noticeRepository.findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType.ALL_PGS).forEach(n -> notices.put(n.getId(), n));
        if (role == Role.OWNER) {
            noticeRepository.findAll().forEach(n -> notices.put(n.getId(), n));
        }
        if (role == Role.MANAGER) {
            noticeRepository.findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType.ALL_MANAGERS).forEach(n -> notices.put(n.getId(), n));
            accessControlService.getAssignedPgIdsForCurrentManager()
                    .forEach(pgId -> noticeRepository.findByTargetPgIdOrderByCreatedAtDesc(pgId).forEach(n -> notices.put(n.getId(), n)));
        }
        if (role == Role.TENANT) {
            noticeRepository.findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType.ALL_TENANTS).forEach(n -> notices.put(n.getId(), n));
            Long pgId = accessControlService.getCurrentTenantProfile().getPg().getId();
            noticeRepository.findByTargetPgIdOrderByCreatedAtDesc(pgId).forEach(n -> notices.put(n.getId(), n));
        }
        noticeRepository.findByTargetUserIdOrderByCreatedAtDesc(userId).forEach(n -> notices.put(n.getId(), n));
        if (role == Role.OWNER || role == Role.MANAGER) {
            noticeRepository.findByCreatedByIdOrderByCreatedAtDesc(userId).forEach(n -> notices.put(n.getId(), n));
        }
        LocalDateTime now = LocalDateTime.now();
        return new ArrayList<>(notices.values()).stream()
                .filter(notice -> isVisibleToCurrentUser(notice, userId, role, now))
                .sorted(Comparator.comparing(this::noticeSortTime).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NoticeResponse publishNotice(NoticeCreateRequest request) {
        User currentUser = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        validateTargets(currentUser.getRole(), request);
        String title = request.getTitle() == null ? "" : request.getTitle().trim();
        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (title.length() < 3 || title.length() > 120) {
            throw new BadRequestException("Title must be between 3 and 120 characters");
        }
        if (content.length() < 5 || content.length() > 5000) {
            throw new BadRequestException("Content must be between 5 and 5000 characters");
        }
        Pg targetPg = request.getTargetPgId() == null ? null : pgRepository.findById(request.getTargetPgId())
                .orElseThrow(() -> new NotFoundException("Target PG not found"));
        User targetUser = request.getTargetUserId() == null ? null : userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new NotFoundException("Target user not found"));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime scheduledAt = request.getScheduledAt() == null ? now : request.getScheduledAt();
        if (scheduledAt.isBefore(now.minusMinutes(1))) {
            throw new BadRequestException("Scheduled time cannot be in the past");
        }
        Notice notice = noticeRepository.save(Notice.builder()
                .title(title)
                .content(content)
                .targetType(request.getTargetType())
                .targetPg(targetPg)
                .targetUser(targetUser)
                .createdBy(currentUser)
                .createdAt(now)
                .scheduledAt(scheduledAt)
                .build());
        return toResponse(notice);
    }

    @Transactional
    public void markRead(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId).orElseThrow(() -> new NotFoundException("Notice not found"));
        if (isScheduled(notice, LocalDateTime.now())) {
            throw new BadRequestException("Scheduled notice is not available yet");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        if (noticeReadRepository.findByNoticeIdAndUserId(noticeId, userId).isEmpty()) {
            User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
            noticeReadRepository.save(NoticeRead.builder().notice(notice).user(user).readAt(LocalDateTime.now()).build());
        }
    }

    @Transactional
    public void deleteNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId).orElseThrow(() -> new NotFoundException("Notice not found"));
        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (!notice.getCreatedBy().getId().equals(currentUserId)) {
            throw new BadRequestException("Only the notice publisher can delete this notice");
        }
        noticeReadRepository.deleteByNoticeId(noticeId);
        noticeRepository.delete(notice);
    }

    public NoticeResponse toResponse(Notice notice) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return NoticeResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .targetType(notice.getTargetType())
                .targetPgId(notice.getTargetPg() != null ? notice.getTargetPg().getId() : null)
                .targetUserId(notice.getTargetUser() != null ? notice.getTargetUser().getId() : null)
                .createdById(notice.getCreatedBy().getId())
                .createdByName(notice.getCreatedBy().getName())
                .createdAt(notice.getCreatedAt())
                .scheduledAt(notice.getScheduledAt())
                .deliveryStatus(isScheduled(notice, LocalDateTime.now()) ? "SCHEDULED" : "SENT")
                .read(currentUserId != null && noticeReadRepository.findByNoticeIdAndUserId(notice.getId(), currentUserId).isPresent())
                .readCount(noticeReadRepository.findByNoticeId(notice.getId()).size())
                .build();
    }

    public List<NoticeReadReceiptResponse> getReadReceipts(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new NotFoundException("Notice not found"));
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Role currentRole = SecurityUtils.getCurrentUserRole();
        if (!notice.getCreatedBy().getId().equals(currentUserId) && currentRole != Role.OWNER) {
            throw new BadRequestException("Only the notice poster or owner can view read receipts");
        }
        return noticeReadRepository.findByNoticeIdOrderByReadAtDesc(noticeId).stream()
                .map(read -> NoticeReadReceiptResponse.builder()
                        .userId(read.getUser().getId())
                        .userName(read.getUser().getName())
                        .role(read.getUser().getRole())
                        .readAt(read.getReadAt())
                        .build())
                .toList();
    }

    private void validateTargets(Role role, NoticeCreateRequest request) {
        if (request.getTargetType() == NoticeTargetType.SPECIFIC_PG && request.getTargetPgId() == null) {
            throw new BadRequestException("targetPgId is required");
        }
        if (request.getTargetType() == NoticeTargetType.SPECIFIC_TENANT && request.getTargetUserId() == null) {
            throw new BadRequestException("targetUserId is required");
        }
        if (role == Role.MANAGER) {
            if (request.getTargetType() != NoticeTargetType.SPECIFIC_PG && request.getTargetType() != NoticeTargetType.SPECIFIC_TENANT) {
                throw new BadRequestException("Manager can only target assigned PGs or tenants in assigned PGs");
            }
            if (request.getTargetPgId() != null) {
                accessControlService.ensureManagerAssignedToPg(request.getTargetPgId());
            }
            if (request.getTargetUserId() != null) {
                TenantProfile tenantProfile = tenantProfileRepository.findByUserId(request.getTargetUserId())
                        .orElseThrow(() -> new NotFoundException("Target tenant not found"));
                accessControlService.ensureManagerAssignedToPg(tenantProfile.getPg().getId());
            }
        }
    }

    private boolean isVisibleToCurrentUser(Notice notice, Long userId, Role role, LocalDateTime now) {
        if (role == Role.OWNER || notice.getCreatedBy().getId().equals(userId)) {
            return true;
        }
        return !isScheduled(notice, now);
    }

    private boolean isScheduled(Notice notice, LocalDateTime now) {
        return notice.getScheduledAt() != null && notice.getScheduledAt().isAfter(now);
    }

    private LocalDateTime noticeSortTime(Notice notice) {
        return notice.getScheduledAt() != null ? notice.getScheduledAt() : notice.getCreatedAt();
    }
}
