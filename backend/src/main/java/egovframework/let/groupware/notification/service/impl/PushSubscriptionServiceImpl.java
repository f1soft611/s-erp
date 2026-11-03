package egovframework.let.groupware.notification.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionStatusVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionVO;
import egovframework.let.groupware.notification.domain.repository.PushSubscriptionDAO;
import egovframework.let.groupware.notification.service.PushEndpointPolicy;
import egovframework.let.groupware.notification.service.PushSubscriptionCipher;
import egovframework.let.groupware.notification.service.PushSubscriptionRateLimiter;
import egovframework.let.groupware.notification.service.PushSubscriptionService;

@Service("pushSubscriptionService")
public class PushSubscriptionServiceImpl implements PushSubscriptionService {

    private static final long MAX_ACTIVE_SUBSCRIPTIONS = 10L;

    private final PushSubscriptionDAO pushSubscriptionDAO;
    private final PushEndpointPolicy endpointPolicy;
    private final PushSubscriptionCipher cipher;
    private final PushSubscriptionRateLimiter rateLimiter;
    private final boolean enabled;
    private final String vapidPublicKey;

    public PushSubscriptionServiceImpl(PushSubscriptionDAO pushSubscriptionDAO,
            PushEndpointPolicy endpointPolicy, PushSubscriptionCipher cipher,
            PushSubscriptionRateLimiter rateLimiter,
            @Value("${WEB_PUSH_ENABLED:false}") boolean enabled,
            @Value("${WEB_PUSH_VAPID_PUBLIC_KEY:}") String vapidPublicKey) {
        this.pushSubscriptionDAO = pushSubscriptionDAO;
        this.endpointPolicy = endpointPolicy;
        this.cipher = cipher;
        this.rateLimiter = rateLimiter;
        this.enabled = enabled;
        this.vapidPublicKey = vapidPublicKey;
    }

    @Override
    @Transactional(readOnly = true)
    public PushSubscriptionStatusVO getStatus(LoginVO user, String endpointHash) throws Exception {
        Owner owner = owner(user);
        rateLimiter.check(owner.tenantId, owner.userId);
        byte[] hash = endpointHash == null ? null : decodeEndpointHash(endpointHash);
        Long activeCount = pushSubscriptionDAO.countActiveSubscriptions(owner.tenantId, owner.userId);
        if (activeCount == null || activeCount < 0) {
            throw new IllegalStateException("Unable to read active push subscription count.");
        }

        PushSubscriptionStatusVO response = new PushSubscriptionStatusVO();
        response.setEnabled(enabled);
        response.setActiveDeviceCount(activeCount);
        response.setVapidPublicKey(enabled ? requireVapidPublicKey() : null);
        PushSubscriptionStatusVO.CurrentDevice current = new PushSubscriptionStatusVO.CurrentDevice();
        if (hash != null) {
            List<PushSubscriptionVO> subscriptions = pushSubscriptionDAO.selectActiveSubscriptions(
                    owner.tenantId, owner.userId);
            if (subscriptions == null) {
                throw new IllegalStateException("Unable to read active push subscriptions.");
            }
            for (PushSubscriptionVO subscription : subscriptions) {
                if (Arrays.equals(hash, subscription.getEndpointHash())) {
                    current.setSubscribed(true);
                    current.setSubscriptionId(subscription.getSubscriptionId());
                    break;
                }
            }
        }
        response.setCurrentDevice(current);
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long register(LoginVO user, PushSubscriptionRequestVO request) throws Exception {
        Owner owner = owner(user);
        rateLimiter.check(owner.tenantId, owner.userId);
        ensureEnabled();
        endpointPolicy.validate(request);

        byte[] endpointHash = sha256(request.getEndpoint());
        Long lockedOwnerId = pushSubscriptionDAO.lockSubscriptionOwner(owner.tenantId, owner.userId);
        if (lockedOwnerId == null || !lockedOwnerId.equals(owner.userId)) {
            throw unauthorized();
        }
        List<PushSubscriptionVO> activeSubscriptions = pushSubscriptionDAO.selectActiveSubscriptions(
                owner.tenantId, owner.userId);
        if (activeSubscriptions == null) {
            throw new IllegalStateException("Unable to read active push subscriptions.");
        }
        boolean alreadyActive = false;
        for (PushSubscriptionVO subscription : activeSubscriptions) {
            alreadyActive |= Arrays.equals(endpointHash, subscription.getEndpointHash());
        }
        Long activeCount = pushSubscriptionDAO.countActiveSubscriptions(owner.tenantId, owner.userId);
        if (activeCount == null || activeCount < 0) {
            throw new IllegalStateException("Unable to read active push subscription count.");
        }
        if (!alreadyActive && activeCount >= MAX_ACTIVE_SUBSCRIPTIONS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "활성 웹 푸시 기기 수 한도를 초과했습니다.");
        }

        PushSubscriptionRequestVO.Keys keys = request.getKeys();
        PushSubscriptionVO subscription = new PushSubscriptionVO();
        subscription.setTenantId(owner.tenantId);
        subscription.setUserId(owner.userId);
        subscription.setEndpointHash(endpointHash);
        subscription.setEndpointCiphertext(cipher.encrypt(request.getEndpoint()));
        subscription.setKeysCiphertext(cipher.encrypt(keys.getP256dh() + "\n" + keys.getAuth()));
        subscription.setEncryptionKeyVersion(cipher.getKeyVersion());
        subscription.setStatus("ACTIVE");
        if (pushSubscriptionDAO.upsertSubscription(subscription) != 1) {
            throw new IllegalStateException("Unable to save push subscription.");
        }

        PushSubscriptionVO saved = pushSubscriptionDAO.selectSubscriptionByEndpointHash(endpointHash);
        if (saved == null || saved.getSubscriptionId() == null
                || !owner.tenantId.equals(saved.getTenantId())
                || !owner.userId.equals(saved.getUserId())
                || !"ACTIVE".equals(saved.getStatus())) {
            throw new IllegalStateException("Unable to confirm push subscription ownership.");
        }
        return saved.getSubscriptionId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unsubscribe(LoginVO user, Long subscriptionId) throws Exception {
        Owner owner = owner(user);
        rateLimiter.check(owner.tenantId, owner.userId);
        if (subscriptionId == null || subscriptionId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "웹 푸시 구독 ID가 올바르지 않습니다.");
        }
        PushSubscriptionVO subscription = pushSubscriptionDAO.selectSubscription(
                owner.tenantId, owner.userId, subscriptionId);
        if (subscription == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "웹 푸시 구독을 찾을 수 없습니다.");
        }
        if ("INACTIVE".equals(subscription.getStatus())) {
            return;
        }
        if (!"ACTIVE".equals(subscription.getStatus())) {
            throw new IllegalStateException("Push subscription state is invalid.");
        }
        if (pushSubscriptionDAO.deactivateSubscription(owner.tenantId, owner.userId, subscriptionId) == 0) {
            PushSubscriptionVO current = pushSubscriptionDAO.selectSubscription(
                    owner.tenantId, owner.userId, subscriptionId);
            if (current == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "웹 푸시 구독을 찾을 수 없습니다.");
            }
            if (!"INACTIVE".equals(current.getStatus())) {
                throw new IllegalStateException("Unable to deactivate push subscription.");
            }
        }
    }

    private Owner owner(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getUniqId())) {
            throw unauthorized();
        }
        long userId;
        try {
            userId = Long.parseLong(user.getUniqId());
        } catch (NumberFormatException error) {
            throw unauthorized();
        }
        if (userId <= 0) {
            throw unauthorized();
        }
        return new Owner(user.getTenantId(), userId);
    }

    private byte[] decodeEndpointHash(String endpointHash) {
        if (!endpointHash.matches("[0-9a-f]{64}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "웹 푸시 기기 식별자가 올바르지 않습니다.");
        }
        byte[] hash = new byte[32];
        for (int index = 0; index < hash.length; index++) {
            int offset = index * 2;
            hash[index] = (byte) Integer.parseInt(endpointHash.substring(offset, offset + 2), 16);
        }
        return hash;
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable.", error);
        }
    }

    private void ensureEnabled() {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "웹 푸시 기능이 비활성화되어 있습니다.");
        }
        requireVapidPublicKey();
    }

    private String requireVapidPublicKey() {
        if (!StringUtils.hasText(vapidPublicKey)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "웹 푸시 공개키 설정을 확인해 주세요.");
        }
        return vapidPublicKey;
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "로그인 사용자 정보가 올바르지 않습니다.");
    }

    private static final class Owner {
        private final Long tenantId;
        private final Long userId;

        private Owner(Long tenantId, Long userId) {
            this.tenantId = tenantId;
            this.userId = userId;
        }
    }
}
