package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;
import egovframework.let.groupware.notification.domain.model.NotificationVO;
import egovframework.let.groupware.notification.service.PushDeliveryService;
import egovframework.let.groupware.realtime.RealtimePublisher;
import egovframework.let.groupware.realtime.RealtimeArea;

class NotificationServiceImplTest {

    private final NotificationDAO notificationDAO = mock(NotificationDAO.class);
    private final RealtimePublisher realtime = mock(RealtimePublisher.class);
    private final PushDeliveryService pushDeliveryService = mock(PushDeliveryService.class);
    private final NotificationServiceImpl service =
            new NotificationServiceImpl(notificationDAO, realtime, pushDeliveryService);

    @Test
    void onlyInsertedEventsSignalOwnerAndDirectMessageArea() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(1, 0);
        when(notificationDAO.selectNotificationId(anyMap())).thenReturn(73L);
        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE", 72L, "Title", "Summary");
        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE", 72L, "Title", "Summary");
        verify(realtime).publish(4L, 19L, RealtimeArea.NOTIFICATION);
        verify(realtime).publish(4L, 19L, RealtimeArea.MESSAGE);
        verify(pushDeliveryService).enqueue(73L);
        verify(notificationDAO).selectNotificationId(anyMap());
    }


    @Test
    void insertsOneOutboxForNewNotificationUsingItsUniqueTupleInOrder() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(1);
        when(notificationDAO.selectNotificationId(anyMap())).thenReturn(73L);

        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE",
                72L, "Title", "Summary");

        org.mockito.InOrder order = inOrder(notificationDAO, pushDeliveryService);
        order.verify(notificationDAO).insertNotification(anyMap());
        order.verify(notificationDAO).selectNotificationId(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(19L).equals(params.get("recipientUserId"))
                        && "DIRECT_MESSAGE_RECEIVED".equals(params.get("eventType"))
                        && "DIRECT_MESSAGE".equals(params.get("sourceType"))
                        && Long.valueOf(72L).equals(params.get("sourceId"))));
        order.verify(pushDeliveryService).enqueue(73L);
    }

    @Test
    void enqueuesBothSupportedNotificationEventTypes() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(1, 1);
        when(notificationDAO.selectNotificationId(anyMap())).thenReturn(73L, 74L);

        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE",
                72L, "Title", "Summary");
        service.createEvent(4L, 19L, "APPROVAL_COMMENT_MENTION", "APPROVAL_COMMENT",
                75L, "Title", "Summary");

        verify(pushDeliveryService).enqueue(73L);
        verify(pushDeliveryService).enqueue(74L);
    }

    @Test
    void duplicateNotificationDoesNotResolveIdOrEnqueueAnotherOutbox() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(0);

        service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE",
                72L, "Title", "Summary");

        verify(notificationDAO, never()).selectNotificationId(anyMap());
        verify(pushDeliveryService, never()).enqueue(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void outboxFailurePropagatesFromTheNotificationTransaction() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(1);
        when(notificationDAO.selectNotificationId(anyMap())).thenReturn(73L);
        org.mockito.Mockito.doThrow(new IllegalStateException("outbox insert failed"))
                .when(pushDeliveryService).enqueue(73L);

        assertThatThrownBy(() -> service.createEvent(4L, 19L, "DIRECT_MESSAGE_RECEIVED",
                "DIRECT_MESSAGE", 72L, "Title", "Summary"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("outbox insert failed");

        try {
            org.assertj.core.api.Assertions.assertThat(
                    NotificationServiceImpl.class
                            .getMethod("createEvent", Long.class, Long.class, String.class, String.class,
                                    Long.class, String.class, String.class)
                            .getAnnotation(Transactional.class))
                    .isNotNull();
        } catch (NoSuchMethodException error) {
            throw new AssertionError(error);
        }
        verify(realtime, never()).publish(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void readSignalsOnlyForActualRowChanges() throws Exception {
        NotificationVO unread = new NotificationVO();
        NotificationVO read = new NotificationVO();
        read.setReadAt(java.time.LocalDateTime.now());
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(unread, read, read);
        when(notificationDAO.updateNotificationReadAt(anyMap())).thenReturn(1);
        service.markRead(authenticatedUser(), 73L);
        service.markRead(authenticatedUser(), 73L);
        verify(realtime).publish(4L, 12L, RealtimeArea.NOTIFICATION);
    }

    @Test
    void concurrentReadWithNoChangedRowsDoesNotSignal() throws Exception {
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(new NotificationVO());
        when(notificationDAO.updateNotificationReadAt(anyMap())).thenReturn(0);
        service.markRead(authenticatedUser(), 73L);
        org.mockito.Mockito.verifyNoInteractions(realtime);
    }

    @Test
    void emptyBulkArchiveDoesNotSignal() throws Exception {
        service.archiveReadNotifications(authenticatedUser(), null);
        org.mockito.Mockito.verifyNoInteractions(realtime);
    }

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
        verify(realtime).publish(4L, 12L, RealtimeArea.NOTIFICATION);

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
        verify(realtime).publish(4L, 12L, RealtimeArea.NOTIFICATION);
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
