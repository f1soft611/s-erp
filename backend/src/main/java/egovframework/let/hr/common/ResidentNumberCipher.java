package egovframework.let.hr.common;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 주민등록번호 암호화·중복 검사용 해시.
 * 암호화는 AES-256-GCM(키 버전을 AAD로 묶음), 해시는 HMAC-SHA256(hex)이다. 평문은 저장하지 않는다.
 * 키는 환경변수 {@code HR_RESIDENT_NO_ENCRYPTION_KEY}(URL-safe Base64, 패딩 없음, 32바이트)와
 * {@code HR_RESIDENT_NO_ENCRYPTION_KEY_VERSION}으로 주입하며, 없으면 사용 시점에 503으로 알린다.
 * 해시 키는 암호화 키에서 파생하므로 키를 교체하면 해시도 다시 만들어야 한다.
 */
@Component
public class ResidentNumberCipher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int TAG_BYTES = TAG_BITS / 8;
    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private final String encodedKey;
    private final String keyVersion;

    public ResidentNumberCipher(
            @Value("${HR_RESIDENT_NO_ENCRYPTION_KEY:}") String encodedKey,
            @Value("${HR_RESIDENT_NO_ENCRYPTION_KEY_VERSION:}") String keyVersion) {
        this.encodedKey = encodedKey;
        this.keyVersion = keyVersion;
    }

    /** 키와 버전이 모두 올바르게 설정되어 있는지. */
    public boolean isConfigured() {
        try {
            getKeyVersion();
            keyBytes();
            return true;
        } catch (ResponseStatusException error) {
            return false;
        }
    }

    public String getKeyVersion() {
        if (keyVersion == null || keyVersion.trim().isEmpty() || keyVersion.length() > 40) {
            throw unavailable();
        }
        return keyVersion;
    }

    /** 숫자 13자리 주민등록번호를 nonce(12바이트)+GCM 암호문으로 암호화한다. */
    public byte[] encrypt(String value) {
        if (value == null) {
            throw new IllegalArgumentException("주민등록번호가 필요합니다.");
        }
        String version = getKeyVersion();
        SecretKeySpec key = new SecretKeySpec(keyBytes(), "AES");
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(version.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array();
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("주민등록번호를 암호화하지 못했습니다.", error);
        }
    }

    public String decrypt(String storedKeyVersion, byte[] envelope) {
        String currentVersion = getKeyVersion();
        if (!currentVersion.equals(storedKeyVersion) || envelope == null || envelope.length < NONCE_BYTES + TAG_BYTES) {
            throw new IllegalStateException("주민등록번호 암호화 키 버전을 사용할 수 없습니다.");
        }
        SecretKeySpec key = new SecretKeySpec(keyBytes(), "AES");
        try {
            ByteBuffer input = ByteBuffer.wrap(envelope);
            byte[] nonce = new byte[NONCE_BYTES];
            input.get(nonce);
            byte[] encrypted = new byte[input.remaining()];
            input.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(currentVersion.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw new IllegalStateException("주민등록번호를 복호화하지 못했습니다.", error);
        }
    }

    /** 중복 등록 검사용 HMAC-SHA256(hex 64자). 같은 키에서는 항상 같은 값이다. */
    public String hash(String value) {
        if (value == null) {
            throw new IllegalArgumentException("주민등록번호가 필요합니다.");
        }
        getKeyVersion(); // 암호화와 같은 설정 검사(키 버전 포함)를 거친다.
        byte[] master = keyBytes();
        try {
            Mac derive = Mac.getInstance("HmacSHA256");
            derive.init(new SecretKeySpec(master, "HmacSHA256"));
            byte[] hashKey = derive.doFinal("resident-no-hash-v1".getBytes(StandardCharsets.UTF_8));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hashKey, "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            char[] out = new char[digest.length * 2];
            for (int i = 0; i < digest.length; i++) {
                out[i * 2] = HEX[(digest[i] >> 4) & 0x0f];
                out[i * 2 + 1] = HEX[digest[i] & 0x0f];
            }
            return new String(out);
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("주민등록번호 해시를 만들지 못했습니다.", error);
        }
    }

    /** 화면 표시용 마스킹: 생년월일 6자리-성별 1자리****** (예 900101-1******). */
    public static String mask(String digits13) {
        return digits13.substring(0, 6) + "-" + digits13.charAt(6) + "******";
    }

    private byte[] keyBytes() {
        if (encodedKey == null || encodedKey.isEmpty()) {
            throw unavailable();
        }
        try {
            byte[] key = Base64.getUrlDecoder().decode(encodedKey);
            if (key.length != 32
                    || !Base64.getUrlEncoder().withoutPadding().encodeToString(key).equals(encodedKey)) {
                throw unavailable();
            }
            return key;
        } catch (IllegalArgumentException error) {
            throw unavailable();
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "주민등록번호 암호화 키가 설정되지 않았습니다.");
    }
}
