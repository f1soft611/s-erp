package egovframework.let.groupware.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO.Keys;

class PushEndpointPolicyTest {

    private static final String VALID_P256DH =
            "BOH8nTQA5iZhl23-NCzGG9prvOZ5BE0MJXBW-GUkQIvRVTVB32JxmX0V1j6z0r7rnT7-bgi6f2g5fMPpAh5brqM";
    private static final String VALID_AUTH = "AAAAAAAAAAAAAAAAAAAAAA";

    @Test
    void acceptsHttpsEndpointOnAnAllowlistedPushHostWithPublicDnsAddress() throws Exception {
        PushEndpointPolicy policy = policyFor("8.8.8.8");

        policy.validate(request("https://fcm.googleapis.com/fcm/send/opaque-token"));
    }

    @Test
    void rejectsUnsupportedSchemesHostsCredentialsPortsAndQueryStrings() throws Exception {
        PushEndpointPolicy policy = policyFor("8.8.8.8");

        for (String endpoint : new String[] {
                "http://fcm.googleapis.com/send/token",
                "https://not-a-push-service.example/send/token",
                "https://user@fcm.googleapis.com/send/token",
                "https://fcm.googleapis.com:8443/send/token",
                "https://fcm.googleapis.com/send/token?redirect=https://example.com",
                "https://fcm.googleapis.com/send/token#fragment",
                "https://127.0.0.1/send/token",
                "https://fcm.googleapis.com/" + new String(new char[2048]).replace('\0', 'a')
        }) {
            assertBadRequest(() -> policy.validate(request(endpoint)));
        }
    }

    @Test
    void rejectsPrivateLoopbackLinkLocalMulticastAndIpv6UniqueLocalAddresses() throws Exception {
        for (String address : new String[] {
                "10.1.2.3", "172.16.0.1", "192.168.1.1", "127.0.0.1",
                "169.254.1.1", "224.0.0.1", "::", "::1", "fc00::1", "fe80::1", "ff02::1"
        }) {
            PushEndpointPolicy policy = policyFor(address);
            assertBadRequest(() -> policy.validate(
                    request("https://fcm.googleapis.com/fcm/send/opaque-token")));
        }
    }

    @Test
    void rejectsMalformedSubscriptionKeysAndNonP256Points() throws Exception {
        PushEndpointPolicy policy = policyFor("8.8.8.8");

        PushSubscriptionRequestVO missingKeys = request("https://fcm.googleapis.com/send/token");
        missingKeys.setKeys(null);
        assertBadRequest(() -> policy.validate(missingKeys));

        PushSubscriptionRequestVO invalidAuth = request("https://fcm.googleapis.com/send/token");
        invalidAuth.getKeys().setAuth("short");
        assertBadRequest(() -> policy.validate(invalidAuth));

        byte[] invalidPoint = new byte[65];
        invalidPoint[0] = 4;
        PushSubscriptionRequestVO invalidPointRequest = request("https://fcm.googleapis.com/send/token");
        invalidPointRequest.getKeys().setP256dh(
                Base64.getUrlEncoder().withoutPadding().encodeToString(invalidPoint));
        assertBadRequest(() -> policy.validate(invalidPointRequest));
    }

    private static PushEndpointPolicy policyFor(String address) throws UnknownHostException {
        final InetAddress resolvedAddress = InetAddress.getByName(address);
        return new PushEndpointPolicy(host -> new InetAddress[] { resolvedAddress });
    }

    private static PushSubscriptionRequestVO request(String endpoint) {
        PushSubscriptionRequestVO request = new PushSubscriptionRequestVO();
        request.setEndpoint(endpoint);
        Keys keys = new Keys();
        keys.setP256dh(VALID_P256DH);
        keys.setAuth(VALID_AUTH);
        request.setKeys(keys);
        return request;
    }

    private static void assertBadRequest(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
