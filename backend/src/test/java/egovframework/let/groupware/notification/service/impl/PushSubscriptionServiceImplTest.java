package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO.Keys;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionVO;
import egovframework.let.groupware.notification.domain.repository.PushSubscriptionDAO;
import egovframework.let.groupware.notification.service.PushEndpointPolicy;
import egovframework.let.groupware.notification.service.PushSubscriptionCipher;
import egovframework.let.groupware.notification.service.PushSubscriptionRateLimiter;

class PushSubscriptionServiceImplTest {

    private final PushSubscriptionDAO dao = mock(PushSubscriptionDAO.class);
    private final PushEndpointPolicy endpointPolicy = mock(PushEndpointPolicy.class);
    private final PushSubscriptionCipher cipher = mock(PushSubscriptionCipher.class);
    private final PushSubscriptionRateLimiter rateLimiter = mock(PushSubscriptionRateLimiter.class);
    private final PushSubscriptionServiceImpl service =
            new PushSubscriptionServiceImpl(dao, endpointPolicy, cipher, rateLimiter, true,
                    "vapid-public-key");
    private final LoginVO owner = owner();

    @BeforeEach
    void setUp() throws Exception {
        when(dao.lockSubscriptionOwner(4L, 101L)).thenReturn(101L);
        when(dao.selectActiveSubscriptions(4L, 101L)).thenReturn(Collections.<PushSubscriptionVO>emptyList());
        when(dao.countActiveSubscriptions(4L, 101L)).thenReturn(0L);
        when(cipher.getKeyVersion()).thenReturn("key-v1");
        when(cipher.encrypt("https://fcm.googleapis.com/send/token")).thenReturn(new byte[] { 1, 2, 3 });
        when(cipher.encrypt(VALID_P256DH + "\n" + VALID_AUTH)).thenReturn(new byte[] { 4, 5, 6 });
        PushSubscriptionVO saved = new PushSubscriptionVO();
        saved.setSubscriptionId(18L);
        saved.setTenantId(4L);
        saved.setUserId(101L);
        saved.setStatus("ACTIVE");
        when(dao.selectSubscriptionByEndpointHash(any(byte[].class))).thenReturn(saved);
        when(dao.upsertSubscription(any(PushSubscriptionVO.class))).thenAnswer(invocation -> {
            PushSubscriptionVO subscription = invocation.getArgument(0);
            subscription.setSubscriptionId(18L);
            return 1;
        });
    }

    @Test
    void registersOnlyAuthenticatedOwnerAndEncryptsBrowserSubscriptionMaterial() throws Exception {
        long subscriptionId = service.register(owner, request());

        assertThat(subscriptionId).isEqualTo(18L);
        verify(endpointPolicy).validate(any(PushSubscriptionRequestVO.class));
        verify(dao).lockSubscriptionOwner(4L, 101L);
        verify(dao).upsertSubscription(org.mockito.ArgumentMatchers.argThat(subscription ->
                Long.valueOf(4L).equals(subscription.getTenantId())
                        && Long.valueOf(101L).equals(subscription.getUserId())
                        && "ACTIVE".equals(subscription.getStatus())
                        && "key-v1".equals(subscription.getEncryptionKeyVersion())
                        && !java.util.Arrays.equals(subscription.getEndpointCiphertext(),
                                "https://fcm.googleapis.com/send/token".getBytes(java.nio.charset.StandardCharsets.UTF_8))
                        && !java.util.Arrays.equals(subscription.getKeysCiphertext(),
                                (VALID_P256DH + "\n" + VALID_AUTH)
                                        .getBytes(java.nio.charset.StandardCharsets.UTF_8))));
    }

    @Test
    void repeatedRegistrationForTheSameActiveEndpointIsIdempotentAtTheServiceBoundary() throws Exception {
        PushSubscriptionVO active = new PushSubscriptionVO();
        active.setSubscriptionId(18L);
        active.setEndpointHash(java.security.MessageDigest.getInstance("SHA-256")
                .digest("https://fcm.googleapis.com/send/token"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        when(dao.selectActiveSubscriptions(4L, 101L)).thenReturn(Collections.singletonList(active));
        when(dao.countActiveSubscriptions(4L, 101L)).thenReturn(1L);

        assertThat(service.register(owner, request())).isEqualTo(18L);

        verify(dao).upsertSubscription(any(PushSubscriptionVO.class));
    }

    @Test
    void rejectsUnauthenticatedOrInvalidPrincipalWithoutDatabaseAccess() throws Exception {
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.register(null, request()));

        LoginVO invalidOwner = owner();
        invalidOwner.setUniqId("not-a-number");
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.register(invalidOwner, request()));
        verify(dao, never()).upsertSubscription(any(PushSubscriptionVO.class));
    }

    @Test
    void enforcesTenActiveDevicesBeforeUpsert() throws Exception {
        when(dao.countActiveSubscriptions(4L, 101L)).thenReturn(10L);

        assertStatus(HttpStatus.CONFLICT, () -> service.register(owner, request()));

        verify(dao, never()).upsertSubscription(any(PushSubscriptionVO.class));
    }

    @Test
    void returnsCurrentDeviceStatusOnlyFromOwnerScopedSubscriptions() throws Exception {
        PushSubscriptionVO active = new PushSubscriptionVO();
        active.setSubscriptionId(18L);
        active.setEndpointHash(java.security.MessageDigest.getInstance("SHA-256")
                .digest("https://fcm.googleapis.com/send/token".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        when(dao.selectActiveSubscriptions(4L, 101L)).thenReturn(Collections.singletonList(active));

        egovframework.let.groupware.notification.domain.model.PushSubscriptionStatusVO status =
                service.getStatus(owner, endpointHash());
        assertThat(status.getCurrentDevice().isSubscribed()).isTrue();
        assertThat(status.getCurrentDevice().getSubscriptionId()).isEqualTo(18L);
        verify(dao).selectActiveSubscriptions(4L, 101L);
    }

    @Test
    void rejectsInvalidEndpointHashAndDoesNotReturnAnotherOwnersSubscription() throws Exception {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.getStatus(owner, "../../not-a-hash"));

        when(dao.selectSubscription(4L, 101L, 18L)).thenReturn(null);
        assertStatus(HttpStatus.NOT_FOUND, () -> service.unsubscribe(owner, 18L));
        verify(dao, never()).deactivateSubscription(anyLong(), anyLong(), anyLong());
    }

    @Test
    void unsubscribeIsOwnerScopedAndIdempotentForAlreadyInactiveSubscriptions() throws Exception {
        PushSubscriptionVO inactive = new PushSubscriptionVO();
        inactive.setStatus("INACTIVE");
        when(dao.selectSubscription(4L, 101L, 18L)).thenReturn(inactive);

        service.unsubscribe(owner, 18L);

        verify(dao).selectSubscription(4L, 101L, 18L);
        verify(dao, never()).deactivateSubscription(eq(4L), eq(101L), eq(18L));
    }

    @Test
    void deactivatesAnActiveSubscriptionOnlyForItsAuthenticatedOwner() throws Exception {
        PushSubscriptionVO active = new PushSubscriptionVO();
        active.setStatus("ACTIVE");
        when(dao.selectSubscription(4L, 101L, 18L)).thenReturn(active);
        when(dao.deactivateSubscription(4L, 101L, 18L)).thenReturn(1);

        service.unsubscribe(owner, 18L);

        verify(dao).deactivateSubscription(4L, 101L, 18L);
    }

    private static LoginVO owner() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("101");
        return user;
    }

    private static PushSubscriptionRequestVO request() {
        PushSubscriptionRequestVO request = new PushSubscriptionRequestVO();
        request.setEndpoint("https://fcm.googleapis.com/send/token");
        Keys keys = new Keys();
        keys.setP256dh(VALID_P256DH);
        keys.setAuth(VALID_AUTH);
        request.setKeys(keys);
        return request;
    }

    private static String endpointHash() throws Exception {
        byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                .digest("https://fcm.googleapis.com/send/token".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        StringBuilder encoded = new StringBuilder(hash.length * 2);
        for (byte value : hash) {
            encoded.append(String.format("%02x", value & 0xff));
        }
        return encoded.toString();
    }

    private static void assertStatus(HttpStatus expected,
            org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(expected));
    }

    private static final String VALID_P256DH =
            "BOH8nTQA5iZhl23-NCzGG9prvOZ5BE0MJXBW-GUkQIvRVTVB32JxmX0V1j6z0r7rnT7-bgi6f2g5fMPpAh5brqM";
    private static final String VALID_AUTH = "AAAAAAAAAAAAAAAAAAAAAA";
}
