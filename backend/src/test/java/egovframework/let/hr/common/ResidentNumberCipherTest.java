package egovframework.let.hr.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ResidentNumberCipherTest {

    private static String key(int fill) {
        byte[] bytes = new byte[32];
        Arrays.fill(bytes, (byte) fill);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static ResidentNumberCipher cipher(String key, String version) {
        return new ResidentNumberCipher(key, version);
    }

    @Test
    void encryptsAndDecryptsBackToTheOriginalValue() {
        ResidentNumberCipher cipher = cipher(key(7), "v1");
        byte[] envelope = cipher.encrypt("9001011234567");

        assertThat(new String(envelope, StandardCharsets.ISO_8859_1)).doesNotContain("9001011234567");
        assertThat(cipher.decrypt("v1", envelope)).isEqualTo("9001011234567");
    }

    @Test
    void sameValueEncryptsToDifferentCiphertextEachTime() {
        ResidentNumberCipher cipher = cipher(key(7), "v1");
        assertThat(cipher.encrypt("9001011234567")).isNotEqualTo(cipher.encrypt("9001011234567"));
    }

    @Test
    void rejectsTamperedCiphertextAndWrongKeyVersionOrKey() {
        ResidentNumberCipher cipher = cipher(key(7), "v1");
        byte[] envelope = cipher.encrypt("9001011234567");
        byte[] tampered = envelope.clone();
        tampered[tampered.length - 1] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt("v1", tampered)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt("v2", envelope)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher(key(8), "v1").decrypt("v1", envelope)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void hashIsStableHexAndDoesNotRevealTheValue() {
        ResidentNumberCipher cipher = cipher(key(7), "v1");
        String hash = cipher.hash("9001011234567");

        assertThat(hash).hasSize(64).matches("[0-9a-f]+").isEqualTo(cipher.hash("9001011234567"));
        assertThat(hash).isNotEqualTo(cipher.hash("9001011234568"));
        assertThat(hash).isNotEqualTo(cipher(key(8), "v1").hash("9001011234567"));
        assertThat(hash).doesNotContain("9001011234567");
    }

    @Test
    void masksEverythingAfterTheGenderDigit() {
        assertThat(ResidentNumberCipher.mask("9001011234567")).isEqualTo("900101-1******");
        assertThat(ResidentNumberCipher.mask("0507053234567")).isEqualTo("050705-3******");
    }

    @Test
    void reportsServiceUnavailableWhenTheKeyIsMissingOrMalformed() {
        for (ResidentNumberCipher broken : new ResidentNumberCipher[] {
                cipher("", "v1"), cipher(null, "v1"), cipher("not-a-valid-key", "v1"), cipher(key(7), "") }) {
            assertThat(broken.isConfigured()).isFalse();
            assertThatThrownBy(() -> broken.encrypt("9001011234567"))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
            assertThatThrownBy(() -> broken.hash("9001011234567")).isInstanceOf(ResponseStatusException.class);
        }
        assertThat(cipher(key(7), "v1").isConfigured()).isTrue();
    }
}
