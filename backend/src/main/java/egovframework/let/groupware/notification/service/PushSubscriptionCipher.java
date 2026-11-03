package egovframework.let.groupware.notification.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PushSubscriptionCipher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int TAG_BYTES = TAG_BITS / 8;

    private final String encodedKey;
    private final String keyVersion;

    public PushSubscriptionCipher(
            @Value("${WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY:}") String encodedKey,
            @Value("${WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY_VERSION:}") String keyVersion) {
        this.encodedKey = encodedKey;
        this.keyVersion = keyVersion;
    }

    public String getKeyVersion() {
        if (keyVersion == null || keyVersion.trim().isEmpty()
                || keyVersion.length() > 40) {
            throw unavailable();
        }
        return keyVersion;
    }

    public byte[] encrypt(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Push subscription value is required.");
        }
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey(), new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(getKeyVersion().getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.allocate(nonce.length + encrypted.length)
                    .put(nonce)
                    .put(encrypted)
                    .array();
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("Unable to encrypt push subscription data.", error);
        }
    }

    public String decrypt(String storedKeyVersion, byte[] envelope) {
        String currentKeyVersion = getKeyVersion();
        if (!currentKeyVersion.equals(storedKeyVersion)
                || envelope == null || envelope.length < NONCE_BYTES + TAG_BYTES) {
            throw new IllegalStateException("Push subscription encryption key version is unavailable.");
        }
        try {
            ByteBuffer input = ByteBuffer.wrap(envelope);
            byte[] nonce = new byte[NONCE_BYTES];
            input.get(nonce);
            byte[] encrypted = new byte[input.remaining()];
            input.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(currentKeyVersion.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw new IllegalStateException("Unable to decrypt push subscription data.", error);
        }
    }

    private SecretKeySpec encryptionKey() {
        if (encodedKey == null || encodedKey.isEmpty()) {
            throw unavailable();
        }
        try {
            byte[] key = Base64.getUrlDecoder().decode(encodedKey);
            if (key.length != 32
                    || !Base64.getUrlEncoder().withoutPadding().encodeToString(key).equals(encodedKey)) {
                throw unavailable();
            }
            return new SecretKeySpec(key, "AES");
        } catch (IllegalArgumentException error) {
            throw unavailable();
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "웹 푸시 암호화 설정을 확인해 주세요.");
    }
}
