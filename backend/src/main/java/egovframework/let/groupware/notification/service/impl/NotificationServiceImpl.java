package egovframework.let.groupware.notification.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.NotificationPageVO;
import egovframework.let.groupware.notification.domain.model.NotificationVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;
import egovframework.let.groupware.notification.service.NotificationService;

@Service("notificationService")
public class NotificationServiceImpl implements NotificationService {

    private final NotificationDAO notificationDAO;

    public NotificationServiceImpl(NotificationDAO notificationDAO) {
        this.notificationDAO = notificationDAO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createEvent(Long tenantId, Long recipientUserId, String eventType, String sourceType,
            Long sourceId, String title, String summary) throws Exception {
        boolean supportedEvent = ("APPROVAL_COMMENT_MENTION".equals(eventType)
                && "APPROVAL_COMMENT".equals(sourceType))
                || ("DIRECT_MESSAGE_RECEIVED".equals(eventType)
                && "DIRECT_MESSAGE".equals(sourceType));
        if (tenantId == null || tenantId <= 0 || recipientUserId == null || recipientUserId <= 0
                || sourceId == null || sourceId <= 0 || !supportedEvent
                || !StringUtils.hasText(title) || title.length() > 200
                || !StringUtils.hasText(summary) || summary.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알림 이벤트 정보가 올바르지 않습니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("recipientUserId", recipientUserId);
        params.put("eventType", eventType);
        params.put("sourceType", sourceType);
        params.put("sourceId", sourceId);
        params.put("title", title.trim());
        params.put("summary", summary.trim());
        notificationDAO.insertNotification(params);
    }

    @Override
    @Transactional(readOnly = true)
    public Long unreadCount(LoginVO user) throws Exception {
        Map<String, Object> params = ownerParams(user);
        Long count = notificationDAO.selectUnreadCount(params);
        if (count == null) {
            throw new IllegalStateException("미읽음 알림 수 조회 결과가 없습니다.");
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPageVO list(LoginVO user, Integer limit, Long beforeNotificationId, Boolean unreadOnly,
            String eventType)
            throws Exception {
        int safeLimit = limit == null ? 20 : limit;
        if (safeLimit < 1 || safeLimit > 50 || (beforeNotificationId != null && beforeNotificationId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알림 조회 조건이 올바르지 않습니다.");
        }
        validateEventType(eventType);

        Map<String, Object> params = ownerParams(user);
        params.put("limit", safeLimit + 1);
        params.put("beforeNotificationId", beforeNotificationId);
        params.put("unreadOnly", Boolean.TRUE.equals(unreadOnly));
        params.put("eventType", eventType);
        List<NotificationVO> items = notificationDAO.selectNotifications(params);
        if (items == null) {
            throw new IllegalStateException("알림 목록 조회 결과가 없습니다.");
        }

        boolean hasNext = items.size() > safeLimit;
        if (hasNext) {
            items = items.subList(0, safeLimit);
        }
        Long nextCursor = hasNext && !items.isEmpty()
                ? items.get(items.size() - 1).getNotificationId() : null;
        return new NotificationPageVO(items, hasNext, nextCursor);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void archiveNotification(LoginVO user, Long notificationId) throws Exception {
        if (notificationId == null || notificationId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알림 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = ownerParams(user);
        params.put("notificationId", notificationId);
        if (notificationDAO.archiveNotification(params) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다.");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int archiveReadNotifications(LoginVO user, String eventType) throws Exception {
        validateEventType(eventType);
        Map<String, Object> params = ownerParams(user);
        params.put("eventType", eventType);
        return notificationDAO.archiveReadNotifications(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public NotificationVO markRead(LoginVO user, Long notificationId) throws Exception {
        if (notificationId == null || notificationId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알림 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = ownerParams(user);
        params.put("notificationId", notificationId);
        NotificationVO notification = notificationDAO.selectOwnedNotification(params);
        if (notification == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다.");
        }
        if (notification.getReadAt() == null) {
            notificationDAO.updateNotificationReadAt(params);
            NotificationVO updated = notificationDAO.selectOwnedNotification(params);
            if (updated == null) {
                throw new IllegalStateException("읽음 처리한 알림을 다시 조회할 수 없습니다.");
            }
            notification.setReadAt(updated.getReadAt());
        }
        return notification;
    }

    private Map<String, Object> ownerParams(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        long userId;
        try {
            userId = Long.parseLong(user.getUniqId());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 사용자 정보가 올바르지 않습니다.");
        }
        if (userId <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 사용자 정보가 올바르지 않습니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("userId", userId);
        return params;
    }

    private void validateEventType(String eventType) {
        if (eventType != null && !"APPROVAL_COMMENT_MENTION".equals(eventType)
                && !"DIRECT_MESSAGE_RECEIVED".equals(eventType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알림 구분이 올바르지 않습니다.");
        }
    }
}
