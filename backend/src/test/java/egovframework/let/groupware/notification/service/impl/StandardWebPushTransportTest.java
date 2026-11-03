package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

import egovframework.let.groupware.notification.service.WebPushTransport;

class StandardWebPushTransportTest {

    @Test
    void createsEnabledTransportBeanThroughItsConfiguredConstructor() {
        Map<String, Object> properties = new HashMap<String, Object>();
        properties.put("WEB_PUSH_ENABLED", "true");
        byte[] publicKey = new byte[65];
        publicKey[0] = 4;
        properties.put("WEB_PUSH_VAPID_PUBLIC_KEY",
                Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey));
        properties.put("WEB_PUSH_VAPID_PRIVATE_KEY",
                Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]));
        properties.put("WEB_PUSH_VAPID_SUBJECT", "mailto:push@example.invalid");

        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.getEnvironment().getPropertySources()
                .addFirst(new MapPropertySource("webPushTest", properties));
        context.register(StandardWebPushTransport.class);
        try {
            context.refresh();

            assertThat(context.getBean(StandardWebPushTransport.class)).isNotNull();
        } finally {
            context.close();
        }
    }

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
    void sendsWindowsPushTokenQueryWithoutChangingTheDestination() throws Exception {
        String endpoint = "https://wns2.notify.windows.com/w/?token=opaque%2Btoken%2Fvalue";
        RecordingConnection connection = new RecordingConnection(new URL(endpoint), 201);
        AtomicReference<URL> destination = new AtomicReference<URL>();
        transport(url -> {
            destination.set(url);
            return connection;
        }, 5000).send(endpoint, subscriptionPublicKey(),
                Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{}");

        assertThat(destination.get().toExternalForm()).isEqualTo(endpoint);
        assertThat(connection.body.toByteArray()).isNotEmpty();
        assertThat(connection.getInstanceFollowRedirects()).isFalse();
    }

    @Test
    void rejectsQueriesOutsideTheSingleWindowsTokenBeforeOpeningAConnection() throws Exception {
        RecordingConnection connection = new RecordingConnection(
                new URL("https://wns2.notify.windows.com/w/"), 201);
        AtomicReference<URL> destination = new AtomicReference<URL>();
        StandardWebPushTransport transport = transport(url -> {
            destination.set(url);
            return connection;
        }, 5000);
        String publicKey = subscriptionPublicKey();
        String auth = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]);
        for (String endpoint : new String[] {
                "https://fcm.googleapis.com/send/test?token=opaque-token",
                "https://wns2.notify.windows.com/w/?token=",
                "https://wns2.notify.windows.com/w/?other=opaque-token",
                "https://wns2.notify.windows.com/w/?token=one&token=two",
                "https://wns2.notify.windows.com/w/?token=one;other=two"
        }) {
            assertThatThrownBy(() -> transport.send(endpoint, publicKey, auth, "{}"))
                    .isInstanceOfSatisfying(WebPushTransport.TransportException.class,
                            failure -> assertThat(failure.getErrorCode()).isEqualTo("INVALID_ENDPOINT"));
        }
        assertThat(destination.get()).isNull();
    }

    @Test
    void disconnectsARequestWhoseBodyWriteExceedsTheOverallRequestDeadline() throws Exception {
        BlockingWriteConnection connection = new BlockingWriteConnection(
                new URL("https://fcm.googleapis.com/send/test"));
        StandardWebPushTransport boundedTransport = transport(connection, 2000);
        AtomicReference<Throwable> failure = new AtomicReference<Throwable>();
        Thread sender = new Thread(() -> {
            try {
                boundedTransport.send("https://fcm.googleapis.com/send/test", subscriptionPublicKey(),
                        Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]), "{}");
            } catch (Throwable error) {
                failure.set(error);
            }
        });
        sender.setDaemon(true);

        sender.start();
        try {
            assertThat(connection.disconnected.await(4, TimeUnit.SECONDS)).isTrue();
            sender.join(2000);
            assertThat(sender.isAlive()).isFalse();
            assertThat(failure.get()).isInstanceOf(WebPushTransport.TransportException.class)
                    .satisfies(error -> assertThat(((WebPushTransport.TransportException) error).getFailureKind())
                            .isEqualTo(WebPushTransport.FailureKind.TRANSIENT));
        } finally {
            connection.releaseWrite.countDown();
            sender.join(2000);
        }
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

    private static StandardWebPushTransport transport(HttpURLConnection connection) throws Exception {
        return transport(connection, 5000);
    }

    private static StandardWebPushTransport transport(HttpURLConnection connection, int readTimeoutMillis)
            throws Exception {
        return transport(url -> connection, readTimeoutMillis);
    }

    private static StandardWebPushTransport transport(
            StandardWebPushTransport.ConnectionFactory connectionFactory, int readTimeoutMillis)
            throws Exception {
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
                "mailto:push@example.invalid", 3000, readTimeoutMillis, readTimeoutMillis,
                connectionFactory);
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

    private static final class BlockingWriteConnection extends HttpURLConnection {
        private final CountDownLatch disconnected = new CountDownLatch(1);
        private final CountDownLatch releaseWrite = new CountDownLatch(1);

        private BlockingWriteConnection(URL url) {
            super(url);
        }

        @Override public void disconnect() {
            disconnected.countDown();
            releaseWrite.countDown();
        }
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() { connected = true; }
        @Override public OutputStream getOutputStream() {
            return new OutputStream() {
                @Override public void write(int value) throws IOException {
                    try {
                        if (!releaseWrite.await(10, TimeUnit.SECONDS)) {
                            throw new IOException("write timed out");
                        }
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        throw new IOException("write interrupted", error);
                    }
                    if (disconnected.getCount() == 0) {
                        throw new IOException("connection disconnected");
                    }
                }
            };
        }
        @Override public int getResponseCode() { return 201; }
    }
}
