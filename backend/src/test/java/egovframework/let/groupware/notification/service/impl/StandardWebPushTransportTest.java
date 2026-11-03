package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

import org.junit.jupiter.api.Test;

import egovframework.let.groupware.notification.service.WebPushTransport;

class StandardWebPushTransportTest {

    @Test
    void preparesEncryptedPostWithBoundedTimeoutAndRedirectsDisabled() throws Exception {
        RecordingConnection connection = new RecordingConnection(new URL("https://fcm.googleapis.com/send/test"), 201);

        transport(connection).send("https://fcm.googleapis.com/send/test", subscriptionPublicKey(),
                Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{\"notificationId\":3}");

        assertThat(connection.getRequestMethod()).isEqualTo("POST");
        assertThat(connection.getConnectTimeout()).isEqualTo(3000);
        assertThat(connection.getReadTimeout()).isEqualTo(5000);
        assertThat(connection.getInstanceFollowRedirects()).isFalse();
        assertThat(connection.body.toByteArray()).isNotEmpty();
    }

    @Test
    void classifiesGoneStatusAsSubscriptionSpecificFailure() throws Exception {
        for (int status : new int[] {404, 410}) {
            RecordingConnection connection = new RecordingConnection(
                    new URL("https://fcm.googleapis.com/send/test"), status);
            assertThatThrownBy(() -> transport(connection).send("https://fcm.googleapis.com/send/test",
                    subscriptionPublicKey(), Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{}"))
                    .isInstanceOf(WebPushTransport.TransportException.class)
                    .satisfies(error -> assertThat(((WebPushTransport.TransportException) error).getFailureKind())
                            .isEqualTo(WebPushTransport.FailureKind.SUBSCRIPTION_GONE));
        }
    }

    @Test
    void classifiesRetryableAndPermanentStatusesWithoutResponseBodyDetails() throws Exception {
        RecordingConnection retry = new RecordingConnection(new URL("https://fcm.googleapis.com/send/test"), 429);
        retry.retryAfter = "10";
        assertThatThrownBy(() -> transport(retry).send("https://fcm.googleapis.com/send/test",
                subscriptionPublicKey(), Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{}"))
                .isInstanceOf(WebPushTransport.TransportException.class)
                .satisfies(error -> {
                    WebPushTransport.TransportException failure = (WebPushTransport.TransportException) error;
                    assertThat(failure.getFailureKind()).isEqualTo(WebPushTransport.FailureKind.TRANSIENT);
                    assertThat(failure.getRetryAfterSeconds()).isEqualTo(10L);
                });

        RecordingConnection permanent = new RecordingConnection(new URL("https://fcm.googleapis.com/send/test"), 403);
        assertThatThrownBy(() -> transport(permanent).send("https://fcm.googleapis.com/send/test",
                subscriptionPublicKey(), Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{}"))
                .isInstanceOf(WebPushTransport.TransportException.class)
                .satisfies(error -> assertThat(((WebPushTransport.TransportException) error).getFailureKind())
                        .isEqualTo(WebPushTransport.FailureKind.PERMANENT));
    }

    private static StandardWebPushTransport transport(RecordingConnection connection) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair vapid = generator.generateKeyPair();
        ECPublicKey publicKey = (ECPublicKey) vapid.getPublic();
        ECPrivateKey privateKey = (ECPrivateKey) vapid.getPrivate();
        byte[] publicBytes = new byte[65];
        publicBytes[0] = 4;
        put32(publicKey.getW().getAffineX().toByteArray(), publicBytes, 1);
        put32(publicKey.getW().getAffineY().toByteArray(), publicBytes, 33);
        byte[] privateBytes = new byte[32];
        put32(privateKey.getS().toByteArray(), privateBytes, 0);
        return new StandardWebPushTransport(
                Base64.getUrlEncoder().withoutPadding().encodeToString(publicBytes),
                Base64.getUrlEncoder().withoutPadding().encodeToString(privateBytes),
                "mailto:push@example.invalid", 3000, 5000,
                url -> connection);
    }

    private static String subscriptionPublicKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        ECPublicKey publicKey = (ECPublicKey) generator.generateKeyPair().getPublic();
        byte[] encoded = new byte[65];
        encoded[0] = 4;
        put32(publicKey.getW().getAffineX().toByteArray(), encoded, 1);
        put32(publicKey.getW().getAffineY().toByteArray(), encoded, 33);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(encoded);
    }

    private static void put32(byte[] source, byte[] target, int offset) {
        int sourceOffset = Math.max(0, source.length - 32);
        int copyLength = Math.min(32, source.length);
        System.arraycopy(source, sourceOffset, target, offset + 32 - copyLength, copyLength);
    }

    private static final class RecordingConnection extends HttpURLConnection {
        private final int status;
        private final ByteArrayOutputStream body = new ByteArrayOutputStream();
        private String retryAfter;

        private RecordingConnection(URL url, int status) {
            super(url);
            this.status = status;
        }

        @Override public void disconnect() { }
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() { connected = true; }
        @Override public OutputStream getOutputStream() { return body; }
        @Override public int getResponseCode() { return status; }
        @Override public String getHeaderField(String name) {
            return "Retry-After".equalsIgnoreCase(name) ? retryAfter : null;
        }
    }
}
