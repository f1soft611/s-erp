package egovframework.let.groupware.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PushSubscriptionCipherTest {

    private static final String KEY = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(new byte[32]);

    @Test
    void encryptsEndpointMaterialWithFreshAuthenticatedEnvelopesAndRoundTripsVersionedValues() {
        PushSubscriptionCipher cipher = new PushSubscriptionCipher(KEY, "key-v1");

        byte[] first = cipher.encrypt("https://fcm.googleapis.com/send/sensitive-token");
        byte[] second = cipher.encrypt("https://fcm.googleapis.com/send/sensitive-token");

        assertThat(first).isNotEqualTo(second);
        assertThat(new String(first, java.nio.charset.StandardCharsets.UTF_8))
                .doesNotContain("sensitive-token");
        assertThat(cipher.getKeyVersion()).isEqualTo("key-v1");
        assertThat(cipher.decrypt("key-v1", first))
                .isEqualTo("https://fcm.googleapis.com/send/sensitive-token");
    }

    @Test
    void rejectsUnknownKeyVersionTamperingAndInvalidConfiguration() {
        PushSubscriptionCipher cipher = new PushSubscriptionCipher(KEY, "key-v1");
        byte[] envelope = cipher.encrypt("secret");
        envelope[envelope.length - 1] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt("old-key", envelope))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt("key-v1", envelope))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new PushSubscriptionCipher("", "key-v1").encrypt("secret"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatus())
                                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }
}
