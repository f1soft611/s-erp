package egovframework.let.groupware.notification.service.impl;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import egovframework.let.groupware.notification.domain.model.PushDeliveryVO;
import egovframework.let.groupware.notification.domain.model.PushNotificationVO;
import egovframework.let.groupware.notification.domain.model.PushOutboxVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;
import egovframework.let.groupware.notification.domain.repository.PushDeliveryDAO;
import egovframework.let.groupware.notification.domain.repository.PushSubscriptionDAO;
import egovframework.let.groupware.notification.service.PushDeliveryService;
import egovframework.let.groupware.notification.service.PushPayloadFactory;
import egovframework.let.groupware.notification.service.PushSubscriptionCipher;
import egovframework.let.groupware.notification.service.WebPushTransport;
import egovframework.let.groupware.notification.service.WebPushTransport.FailureKind;
import egovframework.let.groupware.notification.service.WebPushTransport.TransportException;

@Service("pushDeliveryService")
public class PushDeliveryServiceImpl implements PushDeliveryService {

    private static final int DEFAULT_BATCH_SIZE = 50;
    private static final int MAX_BATCH_SIZE = 50;
    private static final long MIN_LEASE_SECONDS = 30L;
    private static final int MAX_ATTEMPTS = 5;
    private static final long MAX_PENDING_SECONDS = 3600L;
    private static final long[] RETRY_DELAYS_SECONDS = {30L, 120L, 600L, 1800L};

    private final PushDeliveryDAO deliveryDAO;
    private final NotificationDAO notificationDAO;
    private final PushSubscriptionDAO subscriptionDAO;
    private final PushSubscriptionCipher cipher;
    private final WebPushTransport transport;
    private final PushPayloadFactory payloadFactory;
    private final boolean enabled;
    private final Clock clock;
    private final int batchSize;
    private final long leaseSeconds;

    @Autowired
    public PushDeliveryServiceImpl(PushDeliveryDAO deliveryDAO, NotificationDAO notificationDAO,
            PushSubscriptionDAO subscriptionDAO, PushSubscriptionCipher cipher,
            ObjectProvider<WebPushTransport> transports, PushPayloadFactory payloadFactory,
            @Value("$" + "{WEB_PUSH_ENABLED:false}") boolean enabled,
            @Value("$" + "{WEB_PUSH_DELIVERY_BATCH_SIZE:50}") int batchSize,
            @Value("$" + "{WEB_PUSH_LEASE_SECONDS:30}") long leaseSeconds) {
        this(deliveryDAO, notificationDAO, subscriptionDAO, cipher,
                transports.getIfAvailable(), payloadFactory, enabled, Clock.systemUTC(), batchSize, leaseSeconds);
    }

    PushDeliveryServiceImpl(PushDeliveryDAO deliveryDAO, NotificationDAO notificationDAO,
            PushSubscriptionDAO subscriptionDAO, PushSubscriptionCipher cipher,
            WebPushTransport transport, PushPayloadFactory payloadFactory, boolean enabled, Clock clock) {
        this(deliveryDAO, notificationDAO, subscriptionDAO, cipher, transport, payloadFactory,
                enabled, clock, DEFAULT_BATCH_SIZE, 30L);
    }

    private PushDeliveryServiceImpl(PushDeliveryDAO deliveryDAO, NotificationDAO notificationDAO,
            PushSubscriptionDAO subscriptionDAO, PushSubscriptionCipher cipher,
            WebPushTransport transport, PushPayloadFactory payloadFactory, boolean enabled,
            Clock clock, int batchSize, long leaseSeconds) {
        if (batchSize < 1 || batchSize > MAX_BATCH_SIZE
                || leaseSeconds < MIN_LEASE_SECONDS || leaseSeconds > 300) {
            throw new IllegalArgumentException("Invalid web push worker bounds.");
        }
        this.deliveryDAO = deliveryDAO;
        this.notificationDAO = notificationDAO;
        this.subscriptionDAO = subscriptionDAO;
        this.cipher = cipher;
        this.transport = transport;
        this.payloadFactory = payloadFactory;
        this.enabled = enabled;
        this.clock = clock;
        this.batchSize = batchSize;
        this.leaseSeconds = leaseSeconds;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void enqueue(Long notificationId) throws Exception {
        if (notificationId == null || notificationId.longValue() <= 0) {
            throw new IllegalArgumentException("A positive notification ID is required.");
        }
        PushOutboxVO outbox = new PushOutboxVO();
        outbox.setNotificationId(notificationId);
        int inserted = deliveryDAO.insertOutbox(outbox);
        if (inserted < 0 || inserted > 1) {
            throw new IllegalStateException("Unable to insert web push outbox.");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int expandDueOutboxes() throws Exception {
        UUID leaseToken = UUID.randomUUID();
        LocalDateTime now = now();
        List<PushOutboxVO> outboxes = deliveryDAO.claimOutboxes(
                leaseToken, now.plusSeconds(leaseSeconds), batchSize);
        if (outboxes == null) {
            throw new IllegalStateException("Unable to claim web push outboxes.");
        }
        int expanded = 0;
        for (PushOutboxVO outbox : outboxes) {
            requireOutboxLease(outbox);
            if (!enabled) {
                completeNoRecipient(outbox, leaseToken);
                continue;
            }
            PushNotificationVO notification = notificationDAO.selectPushNotification(outbox.getNotificationId());
            if (notification == null || notification.getTenantId() == null
                    || notification.getRecipientUserId() == null) {
                throw new IllegalStateException("Unable to read notification for web push outbox.");
            }
            List<PushSubscriptionVO> subscriptions = subscriptionDAO.selectActiveSubscriptions(
                    notification.getTenantId(), notification.getRecipientUserId());
            if (subscriptions == null) {
                throw new IllegalStateException("Unable to read active web push subscriptions.");
            }
            if (subscriptions.isEmpty()) {
                completeNoRecipient(outbox, leaseToken);
                continue;
            }
            for (PushSubscriptionVO subscription : subscriptions) {
                if (subscription == null || subscription.getSubscriptionId() == null
                        || !"ACTIVE".equals(subscription.getStatus())) {
                    throw new IllegalStateException("Active web push subscription data is invalid.");
                }
                PushDeliveryVO delivery = new PushDeliveryVO();
                delivery.setOutboxId(outbox.getOutboxId());
                delivery.setSubscriptionId(subscription.getSubscriptionId());
                int inserted = deliveryDAO.insertDelivery(delivery);
                if (inserted < 0 || inserted > 1) {
                    throw new IllegalStateException("Unable to insert web push delivery.");
                }
            }
            if (deliveryDAO.markOutboxExpanded(outbox.getOutboxId(), leaseToken) != 1) {
                throw new IllegalStateException("Web push outbox lease was lost during expansion.");
            }
            expanded++;
        }
        return expanded;
    }

    @Override
    public int deliverDueNotifications() throws Exception {
        if (!enabled) {
            return 0;
        }
        if (transport == null) {
            throw new IllegalStateException("Web push transport is not configured.");
        }
        int attempted = 0;
        while (attempted < batchSize) {
            UUID leaseToken = UUID.randomUUID();
            LocalDateTime now = now();
            List<PushDeliveryVO> deliveries = deliveryDAO.claimDeliveries(
                    leaseToken, now.plusSeconds(leaseSeconds), 1);
            if (deliveries == null) {
                throw new IllegalStateException("Unable to claim web push deliveries.");
            }
            if (deliveries.isEmpty()) {
                break;
            }
            if (deliveries.size() != 1) {
                throw new IllegalStateException("Web push delivery claim exceeded its requested batch size.");
            }
            PushDeliveryVO delivery = deliveries.get(0);
            requireDeliveryLease(delivery);
            processDelivery(delivery, leaseToken, now);
            attempted++;
        }
        return attempted;
    }

    private void processDelivery(PushDeliveryVO delivery, UUID leaseToken, LocalDateTime now) throws Exception {
        if (delivery.getAttemptCount() == null || delivery.getAttemptCount() < 1) {
            throw new IllegalStateException("Web push delivery attempt count is invalid.");
        }
        PushNotificationVO notification = notificationDAO.selectPushNotification(
                notificationIdForOutbox(delivery.getOutboxId()));
        if (notification == null || notification.getArchivedAt() != null || notification.getReadAt() != null) {
            requireDeliveryUpdate(deliveryDAO.markDeliverySuppressed(delivery.getDeliveryId(), leaseToken));
            completeOutboxIfTerminal(delivery.getOutboxId());
            return;
        }
        PushSubscriptionVO subscription = subscriptionDAO.selectSubscriptionForDelivery(
                delivery.getSubscriptionId());
        if (subscription == null || !"ACTIVE".equals(subscription.getStatus())) {
            requireDeliveryUpdate(deliveryDAO.markDeliverySuppressed(delivery.getDeliveryId(), leaseToken));
            completeOutboxIfTerminal(delivery.getOutboxId());
            return;
        }
        if (isExhausted(delivery, now)) {
            requireDeliveryUpdate(deliveryDAO.markDeliveryExhausted(delivery.getDeliveryId(), leaseToken));
            completeOutboxIfTerminal(delivery.getOutboxId());
            return;
        }

        String endpoint = cipher.decrypt(subscription.getEncryptionKeyVersion(),
                subscription.getEndpointCiphertext());
        String keys = cipher.decrypt(subscription.getEncryptionKeyVersion(),
                subscription.getKeysCiphertext());
        int separator = keys.indexOf('\n');
        if (separator <= 0 || separator == keys.length() - 1 || keys.indexOf('\n', separator + 1) >= 0) {
            throw new IllegalStateException("Stored web push subscription keys are invalid.");
        }
        String p256dh = keys.substring(0, separator);
        String auth = keys.substring(separator + 1);
        String payload = payloadFactory.create(notification.getNotificationId());
        int renewed = deliveryDAO.renewDeliveryLease(
                delivery.getDeliveryId(), leaseToken, now().plusSeconds(leaseSeconds));
        if (renewed != 1) {
            throw new IllegalStateException("Web push delivery lease was lost before transport dispatch.");
        }
        try {
            transport.send(endpoint, p256dh, auth, payload);
            requireDeliveryUpdate(deliveryDAO.markDeliverySent(delivery.getDeliveryId(), leaseToken));
        } catch (TransportException failure) {
            recordTransportFailure(delivery, subscription, leaseToken, now, failure);
        }
        completeOutboxIfTerminal(delivery.getOutboxId());
    }

    private Long notificationIdForOutbox(Long outboxId) throws Exception {
        PushOutboxVO outbox = deliveryDAO.selectOutbox(outboxId);
        if (outbox == null || outbox.getNotificationId() == null) {
            throw new IllegalStateException("Unable to read notification ID for web push delivery.");
        }
        return outbox.getNotificationId();
    }

    private void recordTransportFailure(PushDeliveryVO delivery, PushSubscriptionVO subscription,
            UUID leaseToken, LocalDateTime now, TransportException failure) throws Exception {
        FailureKind kind = failure.getFailureKind();
        if (kind == FailureKind.SUBSCRIPTION_GONE) {
            subscriptionDAO.deactivateSubscription(subscription.getTenantId(), subscription.getUserId(),
                    subscription.getSubscriptionId());
            requireDeliveryUpdate(
                    deliveryDAO.markDeliveryPermanentFailure(delivery.getDeliveryId(), leaseToken));
            return;
        }
        if (kind == FailureKind.PERMANENT) {
            requireDeliveryUpdate(
                    deliveryDAO.markDeliveryPermanentFailure(delivery.getDeliveryId(), leaseToken));
            return;
        }
        if (kind != FailureKind.TRANSIENT) {
            throw new IllegalStateException("Web push transport failure classification is invalid.");
        }
        if (delivery.getAttemptCount() >= MAX_ATTEMPTS || isOlderThanLimit(delivery, now)) {
            requireDeliveryUpdate(deliveryDAO.markDeliveryExhausted(delivery.getDeliveryId(), leaseToken));
            return;
        }
        int delayIndex = Math.min(delivery.getAttemptCount() - 1, RETRY_DELAYS_SECONDS.length - 1);
        long delay = RETRY_DELAYS_SECONDS[delayIndex];
        if (failure.getRetryAfterSeconds() != null && failure.getRetryAfterSeconds() > delay) {
            delay = Math.min(failure.getRetryAfterSeconds(), MAX_PENDING_SECONDS);
        }
        LocalDateTime nextAttempt = now.plusSeconds(delay);
        LocalDateTime deadline = delivery.getCreatedAt().plusSeconds(MAX_PENDING_SECONDS);
        if (!nextAttempt.isBefore(deadline)) {
            requireDeliveryUpdate(deliveryDAO.markDeliveryExhausted(delivery.getDeliveryId(), leaseToken));
            return;
        }
        requireDeliveryUpdate(deliveryDAO.scheduleDeliveryRetry(
                delivery.getDeliveryId(), leaseToken, nextAttempt, failure.getErrorCode()));
    }

    private boolean isExhausted(PushDeliveryVO delivery, LocalDateTime now) {
        return delivery.getAttemptCount() > MAX_ATTEMPTS || isOlderThanLimit(delivery, now);
    }

    private boolean isOlderThanLimit(PushDeliveryVO delivery, LocalDateTime now) {
        if (delivery.getCreatedAt() == null) {
            throw new IllegalStateException("Web push delivery creation time is missing.");
        }
        return !delivery.getCreatedAt().plusSeconds(MAX_PENDING_SECONDS).isAfter(now);
    }

    private void completeNoRecipient(PushOutboxVO outbox, UUID leaseToken) throws Exception {
        if (deliveryDAO.markOutboxNoRecipient(outbox.getOutboxId(), leaseToken) != 1) {
            throw new IllegalStateException("Web push outbox lease was lost before completion.");
        }
    }

    private void completeOutboxIfTerminal(Long outboxId) throws Exception {
        deliveryDAO.markOutboxCompleted(outboxId);
    }

    private void requireDeliveryUpdate(int affectedRows) {
        if (affectedRows != 1) {
            throw new IllegalStateException("Web push delivery lease was lost before status update.");
        }
    }

    private void requireOutboxLease(PushOutboxVO outbox) {
        if (outbox == null || outbox.getOutboxId() == null || outbox.getNotificationId() == null
                || outbox.getLeaseToken() == null) {
            throw new IllegalStateException("Claimed web push outbox lease is invalid.");
        }
    }

    private void requireDeliveryLease(PushDeliveryVO delivery) {
        if (delivery == null || delivery.getDeliveryId() == null || delivery.getOutboxId() == null
                || delivery.getSubscriptionId() == null || delivery.getLeaseToken() == null) {
            throw new IllegalStateException("Claimed web push delivery lease is invalid.");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
