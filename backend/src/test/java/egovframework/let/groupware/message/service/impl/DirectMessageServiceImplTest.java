package egovframework.let.groupware.message.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.message.domain.model.DirectMessageCreateRequestVO;
import egovframework.let.groupware.message.domain.repository.DirectMessageDAO;
import egovframework.let.groupware.notification.service.NotificationService;

class DirectMessageServiceImplTest {

    private final DirectMessageDAO messageDAO = mock(DirectMessageDAO.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final DirectMessageServiceImpl service =
            new DirectMessageServiceImpl(messageDAO, notificationService);

    @Test
    void rejectsBlankOrOverlongMessageBeforeDatabaseAccess() throws Exception {
        assertBadRequest(() -> service.createThread(authenticatedUser(), request(22L, "   ")));
        assertBadRequest(() -> service.createThread(authenticatedUser(), request(22L, "x".repeat(5001))));

        verify(messageDAO, never()).insertThread(anyMap());
        verify(notificationService, never()).createEvent(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void rejectsSendingMessageToSelfBeforeDatabaseAccess() throws Exception {
        assertBadRequest(() -> service.createThread(authenticatedUser(), request(11L, "안녕하세요")));

        verify(messageDAO, never()).selectActiveRecipient(anyMap());
    }

    @Test
    void createsThreadMessageAndRecipientNotificationTogether() throws Exception {
        when(messageDAO.selectActiveRecipient(anyMap())).thenReturn(true);
        when(messageDAO.insertThread(anyMap())).thenReturn(65L);
        when(messageDAO.insertMessage(anyMap())).thenReturn(101L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(1);

        service.createThread(authenticatedUser(), request(22L, "안녕하세요"));

        verify(messageDAO).insertMessage(argThat(params ->
                Long.valueOf(65L).equals(params.get("threadId"))
                        && Long.valueOf(11L).equals(params.get("senderUserId"))
                        && Long.valueOf(22L).equals(params.get("recipientUserId"))
                        && "안녕하세요".equals(params.get("content"))));
        verify(notificationService).createEvent(4L, 22L, "DIRECT_MESSAGE_RECEIVED",
                "DIRECT_MESSAGE", 101L, "새 쪽지가 도착했습니다.", "안녕하세요");
    }

    @Test
    void loadsLatestMessageDayFirstAndReportsOlderDays() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 30));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(true);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, null);

        org.assertj.core.api.Assertions.assertThat(page.getMessageDate()).isEqualTo(java.time.LocalDate.of(2026, 10, 30));
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isTrue();
        verify(messageDAO).selectLatestMessageDate(argThat(params -> params.get("beforeDayStart") == null));
        verify(messageDAO).selectThreadMessages(argThat(params ->
                java.time.LocalDateTime.of(2026, 10, 30, 0, 0).equals(params.get("dayStart"))
                        && java.time.LocalDateTime.of(2026, 10, 31, 0, 0).equals(params.get("dayEnd"))));
    }

    @Test
    void loadsPreviousMessageDayBeforeCursorDate() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 27));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(false);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, java.time.LocalDate.of(2026, 10, 30));

        org.assertj.core.api.Assertions.assertThat(page.getMessageDate()).isEqualTo(java.time.LocalDate.of(2026, 10, 27));
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isFalse();
        verify(messageDAO).selectLatestMessageDate(argThat(params ->
                java.time.LocalDateTime.of(2026, 10, 30, 0, 0).equals(params.get("beforeDayStart"))));
    }

    @Test
    void returnsEmptyDayPageWhenNoOlderMessagesExist() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(null);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, java.time.LocalDate.of(2026, 10, 1));

        org.assertj.core.api.Assertions.assertThat(page.getResultList()).isEmpty();
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isFalse();
        verify(messageDAO, never()).selectThreadMessages(anyMap());
    }

    @Test
    void onlyShowsMessagesAfterTheUsersHiddenAt() throws Exception {
        egovframework.let.groupware.message.domain.model.DirectMessageVO thread =
                new egovframework.let.groupware.message.domain.model.DirectMessageVO();
        java.time.LocalDateTime hiddenAt = java.time.LocalDateTime.of(2026, 10, 29, 9, 0);
        thread.setHiddenAt(hiddenAt);
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 30));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(false);

        service.getThread(authenticatedUser(), 65L, null);

        verify(messageDAO).selectThreadMessages(argThat(params -> hiddenAt.equals(params.get("visibleAfter"))));
        verify(messageDAO).selectHasMessagesBefore(argThat(params -> hiddenAt.equals(params.get("visibleAfter"))));
    }

    @Test
    void hidesThreadOnlyForCurrentUserAndMarksItRead() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.hideThreadForParticipant(anyMap())).thenReturn(1);

        service.hideThread(authenticatedUser(), 65L);

        verify(messageDAO).hideThreadForParticipant(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(11L).equals(params.get("userId"))
                        && Long.valueOf(65L).equals(params.get("threadId"))));
        verify(messageDAO).markThreadMessagesRead(anyMap());
        verify(messageDAO).markThreadNotificationsRead(anyMap());
    }

    @Test
    void doesNotHideThreadOfOtherUsers() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.hideThread(authenticatedUser(), 65L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
        verify(messageDAO, never()).hideThreadForParticipant(anyMap());
    }

    @Test
    void listsAllConversationsWhenFolderIsAll() throws Exception {
        when(messageDAO.selectThreads(anyMap())).thenReturn(new java.util.ArrayList<>());

        service.listThreads(authenticatedUser(), "ALL", null, null, null);

        verify(messageDAO).selectThreads(argThat(params -> "ALL".equals(params.get("folder"))));
    }

    @Test
    void resolvesNotificationMessageOnlyInsideAnAuthorizedThread() throws Exception {
        when(messageDAO.selectThreadIdForMessage(anyMap())).thenReturn(65L);

        org.assertj.core.api.Assertions.assertThat(
                service.resolveThreadIdForNotification(authenticatedUser(), 101L)).isEqualTo(65L);
        verify(messageDAO).selectThreadIdForMessage(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(11L).equals(params.get("userId"))
                        && Long.valueOf(101L).equals(params.get("messageId"))));
    }

    @Test
    void doesNotResolveNotificationMessageOutsideTheUsersThreads() throws Exception {
        when(messageDAO.selectThreadIdForMessage(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.resolveThreadIdForNotification(authenticatedUser(), 101L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("11");
        return user;
    }

    private static DirectMessageCreateRequestVO request(Long recipientId, String content) {
        DirectMessageCreateRequestVO request = new DirectMessageCreateRequestVO();
        request.setRecipientUserId(recipientId);
        request.setContent(content);
        return request;
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
