package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;

class NotificationServiceImplTest {

    private final NotificationDAO notificationDAO = mock(NotificationDAO.class);
    private final NotificationServiceImpl service = new NotificationServiceImpl(notificationDAO);

    @Test
    void createsOnlySupportedNotificationEventAndTrimsDisplayText() throws Exception {
        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE",
                72L, " New message ", " Preview ");

        verify(notificationDAO).insertNotification(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(19L).equals(params.get("recipientUserId"))
                        && "DIRECT_MESSAGE_RECEIVED".equals(params.get("eventType"))
                        && "DIRECT_MESSAGE".equals(params.get("sourceType"))
                        && Long.valueOf(72L).equals(params.get("sourceId"))
                        && "New message".equals(params.get("title"))
                        && "Preview".equals(params.get("summary"))));
    }

    @Test
    void rejectsMismatchedNotificationSourceAndEvent() throws Exception {
        assertBadRequest(() -> service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED",
                "APPROVAL_COMMENT", 72L, "New message", "Preview"));

        verify(notificationDAO, never()).insertNotification(anyMap());
    }

    @Test
    void rejectsPageLimitsOutsideOneToFiftyBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 0, null, false, null));
        assertBadRequest(() -> service.list(authenticatedUser(), 51, null, false, null));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void rejectsNonPositiveCursorBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 20, 0L, false, null));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void filtersNotificationsBySupportedEventTypeWithinTheAuthenticatedUserScope() throws Exception {
        when(notificationDAO.selectNotifications(anyMap())).thenReturn(Collections.emptyList());

        service.list(authenticatedUser(), 20, null, true, "DIRECT_MESSAGE_RECEIVED");

        verify(notificationDAO).selectNotifications(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(12L).equals(params.get("userId"))
                        && Boolean.TRUE.equals(params.get("unreadOnly"))
                        && "DIRECT_MESSAGE_RECEIVED".equals(params.get("eventType"))));
    }

    @Test
    void rejectsUnsupportedEventTypeBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 20, null, false, "UNTRUSTED"));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void archivesOneNotificationOnlyWithinTheAuthenticatedUserScope() throws Exception {
        when(notificationDAO.archiveNotification(anyMap())).thenReturn(1);

        service.archiveNotification(authenticatedUser(), 73L);

        verify(notificationDAO).archiveNotification(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(12L).equals(params.get("userId"))
                        && Long.valueOf(73L).equals(params.get("notificationId"))));
    }

    @Test
    void doesNotDiscloseAnotherUsersNotificationWhenArchiving() throws Exception {
        when(notificationDAO.archiveNotification(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> service.archiveNotification(authenticatedUser(), 73L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void archivesReadNotificationsWithinTheSelectedEventType() throws Exception {
        when(notificationDAO.archiveReadNotifications(anyMap())).thenReturn(3);

        int archivedCount = service.archiveReadNotifications(
                authenticatedUser(), "APPROVAL_COMMENT_MENTION");

        org.assertj.core.api.Assertions.assertThat(archivedCount).isEqualTo(3);
        verify(notificationDAO).archiveReadNotifications(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(12L).equals(params.get("userId"))
                        && "APPROVAL_COMMENT_MENTION".equals(params.get("eventType"))));
    }

    @Test
    void rejectsUnsupportedArchiveFilterBeforeUpdating() throws Exception {
        assertBadRequest(() -> service.archiveReadNotifications(authenticatedUser(), "UNTRUSTED"));
        verify(notificationDAO, never()).archiveReadNotifications(anyMap());
    }

    @Test
    void doesNotDiscloseAnotherUsersNotification() throws Exception {
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.markRead(authenticatedUser(), 73L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
        verify(notificationDAO, never()).updateNotificationReadAt(anyMap());
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("12");
        return user;
    }

    private static void assertBadRequest(ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run() throws Exception;
    }
}
