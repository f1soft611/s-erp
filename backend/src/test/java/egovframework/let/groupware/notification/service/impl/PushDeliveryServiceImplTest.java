package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.groupware.notification.domain.model.PushNotificationVO;
import egovframework.let.groupware.notification.domain.model.PushDeliveryVO;
import egovframework.let.groupware.notification.domain.model.PushOutboxVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;
import egovframework.let.groupware.notification.domain.repository.PushDeliveryDAO;
import egovframework.let.groupware.notification.domain.repository.PushSubscriptionDAO;
import egovframework.let.groupware.notification.service.PushPayloadFactory;
import egovframework.let.groupware.notification.service.PushSubscriptionCipher;
import egovframework.let.groupware.notification.service.WebPushTransport;

class PushDeliveryServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-11-03T03:00:00Z");

    private final PushDeliveryDAO deliveryDAO = mock(PushDeliveryDAO.class);
    private final NotificationDAO notificationDAO = mock(NotificationDAO.class);
    private final PushSubscriptionDAO subscriptionDAO = mock(PushSubscriptionDAO.class);
    private final PushSubscriptionCipher cipher = mock(PushSubscriptionCipher.class);
    private final WebPushTransport transport = mock(WebPushTransport.class);
    private PushDeliveryServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        service = new PushDeliveryServiceImpl(deliveryDAO, notificationDAO, subscriptionDAO, cipher,
                transport, new PushPayloadFactory(new ObjectMapper()), true,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(deliveryDAO.selectOutbox(11L)).thenReturn(outbox(11L, 123L));
        when(deliveryDAO.markOutboxExpanded(anyLong(), any(UUID.class))).thenReturn(1);
        when(deliveryDAO.markOutboxNoRecipient(anyLong(), any(UUID.class))).thenReturn(1);
    }

    @Test
    void claimsDueOutboxesAsBoundedLeasesAndExpandsEachActiveSubscriptionOnce() throws Exception {
        PushOutboxVO outbox = outbox(11L, 123L);
        when(deliveryDAO.claimOutboxes(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(outbox));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectActiveSubscriptions(4L, 19L))
                .thenReturn(Arrays.asList(subscription(31L), subscription(32L)));

        service.expandDueOutboxes();

        ArgumentCaptor<LocalDateTime> lease = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(deliveryDAO).claimOutboxes(any(UUID.class), lease.capture(), eq(50));
        assertThat(lease.getValue()).isEqualTo(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC).plusSeconds(30));
        verify(deliveryDAO).insertDelivery(org.mockito.ArgumentMatchers.argThat(delivery ->
                Long.valueOf(11L).equals(delivery.getOutboxId())
                        && Long.valueOf(31L).equals(delivery.getSubscriptionId())));
        verify(deliveryDAO).insertDelivery(org.mockito.ArgumentMatchers.argThat(delivery ->
                Long.valueOf(11L).equals(delivery.getOutboxId())
                        && Long.valueOf(32L).equals(delivery.getSubscriptionId())));
        verify(deliveryDAO).markOutboxExpanded(eq(11L), any(UUID.class));
    }

    @Test
    void completesOutboxWithoutAnyActiveSubscription() throws Exception {
        when(deliveryDAO.claimOutboxes(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(outbox(11L, 123L)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectActiveSubscriptions(4L, 19L)).thenReturn(Collections.emptyList());

        service.expandDueOutboxes();

        verify(deliveryDAO).markOutboxNoRecipient(eq(11L), any(UUID.class));
        verify(deliveryDAO, never()).insertDelivery(any());
    }

    @Test
    void deliversPayloadWithoutNotificationTextAndMarksAcceptedResponseSent() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(delivery(21L, 11L, 31L, 1)));
        PushNotificationVO notification = notification(123L);
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification);
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(subscription(31L));
        when(cipher.decrypt(eq("v1"), any(byte[].class))).thenReturn(
                "https://fcm.googleapis.com/send/token", "p256dh\nauth");

        service.deliverDueNotifications();

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(transport).send(eq("https://fcm.googleapis.com/send/token"), eq("p256dh"), eq("auth"),
                payload.capture());
        assertThat(payload.getValue()).contains("\"notificationId\":123", "\"kind\":\"notification\"")
                .doesNotContain("title", "summary", "content", "endpoint", "p256dh", "auth");
        verify(deliveryDAO).markDeliverySent(eq(21L), any(UUID.class));
    }

    @Test
    void disablesExpiredSubscriptionAndMarksItsDeliveryTerminal() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(delivery(21L, 11L, 31L, 1)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(subscription(31L));
        when(cipher.decrypt(anyString(), any(byte[].class))).thenReturn(
                "https://fcm.googleapis.com/send/token", "p256dh\nauth");
        org.mockito.Mockito.doThrow(new WebPushTransport.TransportException(
                WebPushTransport.FailureKind.SUBSCRIPTION_GONE, "HTTP_GONE", 410, null))
                .when(transport).send(anyString(), anyString(), anyString(), anyString());

        service.deliverDueNotifications();

        verify(subscriptionDAO).deactivateSubscription(4L, 19L, 31L);
        verify(deliveryDAO).markDeliveryPermanentFailure(eq(21L), any(UUID.class));
    }

    @Test
    void schedulesTransientFailureWithBackoffAndPreservesOtherDeviceDelivery() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Arrays.asList(delivery(21L, 11L, 31L, 1), delivery(22L, 11L, 32L, 1)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(subscription(31L));
        when(subscriptionDAO.selectSubscriptionForDelivery(32L)).thenReturn(subscription(32L));
        when(cipher.decrypt(anyString(), any(byte[].class))).thenReturn(
                "https://fcm.googleapis.com/send/token", "p256dh\nauth",
                "https://fcm.googleapis.com/send/token", "p256dh\nauth");
        org.mockito.Mockito.doThrow(new WebPushTransport.TransportException(
                WebPushTransport.FailureKind.TRANSIENT, "HTTP_429", 429, 5L))
                .doNothing().when(transport).send(anyString(), anyString(), anyString(), anyString());

        service.deliverDueNotifications();

        verify(deliveryDAO).scheduleDeliveryRetry(eq(21L), any(UUID.class),
                eq(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC).plusSeconds(30)), eq("HTTP_429"));
        verify(deliveryDAO).markDeliverySent(eq(22L), any(UUID.class));
    }

    @Test
    void marksPermanentFailureAndExhaustedAttemptWithoutAnotherNetworkCall() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Arrays.asList(delivery(21L, 11L, 31L, 1), delivery(22L, 11L, 32L, 6)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(subscription(31L));
        when(subscriptionDAO.selectSubscriptionForDelivery(32L)).thenReturn(subscription(32L));
        when(cipher.decrypt(anyString(), any(byte[].class))).thenReturn(
                "https://fcm.googleapis.com/send/token", "p256dh\nauth");
        org.mockito.Mockito.doThrow(new WebPushTransport.TransportException(
                WebPushTransport.FailureKind.PERMANENT, "HTTP_403", 403, null))
                .when(transport).send(anyString(), anyString(), anyString(), anyString());

        service.deliverDueNotifications();

        verify(deliveryDAO).markDeliveryPermanentFailure(eq(21L), any(UUID.class));
        verify(deliveryDAO).markDeliveryExhausted(eq(22L), any(UUID.class));
        verify(transport).send(anyString(), anyString(), anyString(), anyString());
    }


    @Test
    void suppressesDeliveryForInactiveSubscriptionAndCompletesItsOutbox() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(delivery(21L, 11L, 31L, 1)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(null);

        service.deliverDueNotifications();

        verify(deliveryDAO).markDeliverySuppressed(eq(21L), any(UUID.class));
        verify(deliveryDAO).markOutboxCompleted(11L);
        verify(transport, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void makesFifthTransientFailureTerminalInsteadOfSchedulingAnUnboundedRetry() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(delivery(21L, 11L, 31L, 5)));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification(123L));
        when(subscriptionDAO.selectSubscriptionForDelivery(31L)).thenReturn(subscription(31L));
        when(cipher.decrypt(anyString(), any(byte[].class))).thenReturn(
                "https://fcm.googleapis.com/send/token", "p256dh\nauth");
        org.mockito.Mockito.doThrow(new WebPushTransport.TransportException(
                WebPushTransport.FailureKind.TRANSIENT, "NETWORK_ERROR", 0, null))
                .when(transport).send(anyString(), anyString(), anyString(), anyString());

        service.deliverDueNotifications();

        verify(deliveryDAO).markDeliveryExhausted(eq(21L), any(UUID.class));
        verify(deliveryDAO, never()).scheduleDeliveryRetry(eq(21L), any(UUID.class),
                any(LocalDateTime.class), anyString());
    }

    @Test
    void suppressesArchivedOrReadNotificationsBeforeNetworkDispatch() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenReturn(Collections.singletonList(delivery(21L, 11L, 31L, 1)));
        PushNotificationVO notification = notification(123L);
        notification.setArchivedAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        when(notificationDAO.selectPushNotification(123L)).thenReturn(notification);

        service.deliverDueNotifications();

        verify(deliveryDAO).markDeliverySuppressed(eq(21L), any(UUID.class));
        verify(transport, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void propagatesDatabaseFailuresInsteadOfTreatingThemAsTransportErrors() throws Exception {
        when(deliveryDAO.claimDeliveries(any(UUID.class), any(LocalDateTime.class), eq(50)))
                .thenThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> service.deliverDueNotifications())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database unavailable");
        verify(transport, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    private static PushOutboxVO outbox(Long outboxId, Long notificationId) {
        PushOutboxVO outbox = new PushOutboxVO();
        outbox.setOutboxId(outboxId);
        outbox.setNotificationId(notificationId);
        outbox.setLeaseToken(UUID.randomUUID());
        return outbox;
    }

    private static PushDeliveryVO delivery(Long id, Long outboxId, Long subscriptionId, int attempts) {
        PushDeliveryVO delivery = new PushDeliveryVO();
        delivery.setDeliveryId(id);
        delivery.setOutboxId(outboxId);
        delivery.setSubscriptionId(subscriptionId);
        delivery.setAttemptCount(attempts);
        delivery.setLeaseToken(UUID.randomUUID());
        delivery.setCreatedAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        return delivery;
    }

    private static PushNotificationVO notification(Long notificationId) {
        PushNotificationVO notification = new PushNotificationVO();
        notification.setNotificationId(notificationId);
        notification.setTenantId(4L);
        notification.setRecipientUserId(19L);
        return notification;
    }

    private static PushSubscriptionVO subscription(Long id) {
        PushSubscriptionVO subscription = new PushSubscriptionVO();
        subscription.setSubscriptionId(id);
        subscription.setTenantId(4L);
        subscription.setUserId(19L);
        subscription.setStatus("ACTIVE");
        subscription.setEncryptionKeyVersion("v1");
        subscription.setEndpointCiphertext(new byte[] {1});
        subscription.setKeysCiphertext(new byte[] {2});
        return subscription;
    }
}
