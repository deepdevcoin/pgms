package com.pgms.backend.service;

import com.pgms.backend.dto.notice.NoticeCreateRequest;
import com.pgms.backend.dto.notice.NoticeResponse;
import com.pgms.backend.entity.Notice;
import com.pgms.backend.entity.NoticeRead;
import com.pgms.backend.entity.Pg;
import com.pgms.backend.entity.User;
import com.pgms.backend.entity.enums.NoticeTargetType;
import com.pgms.backend.entity.enums.Role;
import com.pgms.backend.exception.BadRequestException;
import com.pgms.backend.exception.NotFoundException;
import com.pgms.backend.repository.NoticeReadRepository;
import com.pgms.backend.repository.NoticeRepository;
import com.pgms.backend.repository.PgRepository;
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
    private final AccessControlService accessControlService;

    public NoticeService(NoticeRepository noticeRepository,
                         NoticeReadRepository noticeReadRepository,
                         UserRepository userRepository,
                         PgRepository pgRepository,
                         AccessControlService accessControlService) {
        this.noticeRepository = noticeRepository;
        this.noticeReadRepository = noticeReadRepository;
        this.userRepository = userRepository;
        this.pgRepository = pgRepository;
        this.accessControlService = accessControlService;
    }

    public List<NoticeResponse> getRelevantNotices() {
        Long userId = SecurityUtils.getCurrentUserId();
        Role role = SecurityUtils.getCurrentUserRole();
        Map<Long, Notice> notices = new LinkedHashMap<>();
        noticeRepository.findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType.ALL_PGS).forEach(n -> notices.put(n.getId(), n));
        if (role == Role.MANAGER) {
            noticeRepository.findByTargetTypeOrderByCreatedAtDesc(NoticeTargetType.ALL_MANAGERS).forEach(n -> notices.put(n.getId(), n));
            accessControlService.getAssignedPgIdsForCurrentManager()
                    .forEach(pgId -> noticeRepository.findByTargetPgIdOrderByCreatedAtDesc(pgId).forEach(n -> notices.put(n.getId(), n)));
        }
        if (role == Role.TENANT) {
            Long pgId = accessControlService.getCurrentTenantProfile().getPg().getId();
            noticeRepository.findByTargetPgIdOrderByCreatedAtDesc(pgId).forEach(n -> notices.put(n.getId(), n));
        }
        noticeRepository.findByTargetUserIdOrderByCreatedAtDesc(userId).forEach(n -> notices.put(n.getId(), n));
        return new ArrayList<>(notices.values()).stream()
                .sorted(Comparator.comparing(Notice::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NoticeResponse publishNotice(NoticeCreateRequest request) {
        User currentUser = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        validateTargets(currentUser.getRole(), request);
        Pg targetPg = request.getTargetPgId() == null ? null : pgRepository.findById(request.getTargetPgId())
                .orElseThrow(() -> new NotFoundException("Target PG not found"));
        User targetUser = request.getTargetUserId() == null ? null : userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new NotFoundException("Target user not found"));
        Notice notice = noticeRepository.save(Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .targetType(request.getTargetType())
                .targetPg(targetPg)
                .targetUser(targetUser)
                .createdBy(currentUser)
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(notice);
    }

    @Transactional
    public void markRead(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId).orElseThrow(() -> new NotFoundException("Notice not found"));
        Long userId = SecurityUtils.getCurrentUserId();
        if (noticeReadRepository.findByNoticeIdAndUserId(noticeId, userId).isEmpty()) {
            User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
            noticeReadRepository.save(NoticeRead.builder().notice(notice).user(user).readAt(LocalDateTime.now()).build());
        }
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
                .createdByName(notice.getCreatedBy().getName())
                .createdAt(notice.getCreatedAt())
                .read(currentUserId != null && noticeReadRepository.findByNoticeIdAndUserId(notice.getId(), currentUserId).isPresent())
                .readCount(noticeReadRepository.findByNoticeId(notice.getId()).size())
                .build();
    }

    private void validateTargets(Role role, NoticeCreateRequest request) {
        if (request.getTargetType() == NoticeTargetType.SPECIFIC_PG && request.getTargetPgId() == null) {
            throw new BadRequestException("targetPgId is required");
        }
        if (request.getTargetType() == NoticeTargetType.SPECIFIC_TENANT && request.getTargetUserId() == null) {
            throw new BadRequestException("targetUserId is required");
        }
        if (role == Role.MANAGER) {
            if (request.getTargetType() == NoticeTargetType.ALL_PGS || request.getTargetType() == NoticeTargetType.ALL_MANAGERS) {
                throw new BadRequestException("Manager cannot use this target type");
            }
            if (request.getTargetPgId() != null) {
                accessControlService.ensureManagerAssignedToPg(request.getTargetPgId());
            }
        }
    }
}
