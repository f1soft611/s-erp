package egovframework.let.groupware.notification.service.impl;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.security.Security;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;

import javax.annotation.PostConstruct;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.HttpPost;
import org.jose4j.lang.JoseException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import egovframework.let.groupware.notification.service.WebPushTransport;
import egovframework.let.groupware.notification.service.WebPushTransport.FailureKind;
import egovframework.let.groupware.notification.service.WebPushTransport.TransportException;

@Component
@ConditionalOnProperty(name = "WEB_PUSH_ENABLED", havingValue = "true")
public class StandardWebPushTransport implements WebPushTransport {

    private static final int MAX_TTL_SECONDS = 3600;
    private static final int MAX_RETRY_AFTER_SECONDS = 3600;

    private final String vapidPublicKey;
    private final String vapidPrivateKey;
    private final String vapidSubject;
    private final int connectTimeoutMillis;
    private final int readTimeoutMillis;
    private final ConnectionFactory connectionFactory;

    public StandardWebPushTransport(
            @Value("$" + "{WEB_PUSH_VAPID_PUBLIC_KEY}") String vapidPublicKey,
            @Value("$" + "{WEB_PUSH_VAPID_PRIVATE_KEY}") String vapidPrivateKey,
            @Value("$" + "{WEB_PUSH_VAPID_SUBJECT}") String vapidSubject,
            @Value("$" + "{WEB_PUSH_CONNECT_TIMEOUT_MS:3000}") int connectTimeoutMillis,
            @Value("$" + "{WEB_PUSH_READ_TIMEOUT_MS:5000}") int readTimeoutMillis) {
        this(vapidPublicKey, vapidPrivateKey, vapidSubject, connectTimeoutMillis, readTimeoutMillis,
                url -> (HttpURLConnection) url.openConnection());
    }

    StandardWebPushTransport(String vapidPublicKey, String vapidPrivateKey, String vapidSubject,
            int connectTimeoutMillis, int readTimeoutMillis, ConnectionFactory connectionFactory) {
        this.vapidPublicKey = vapidPublicKey;
        this.vapidPrivateKey = vapidPrivateKey;
        this.vapidSubject = vapidSubject;
        this.connectTimeoutMillis = connectTimeoutMillis;
        this.readTimeoutMillis = readTimeoutMillis;
        this.connectionFactory = connectionFactory;
        validateConfiguration();
    }

    @PostConstruct
    public void validateConfiguration() {
        if (vapidPublicKey == null || vapidPublicKey.trim().isEmpty()
                || vapidPrivateKey == null || vapidPrivateKey.trim().isEmpty()
                || vapidSubject == null || !vapidSubject.matches("mailto:[^\\s@]+@[^\\s@]+")
                || connectTimeoutMillis < 1 || connectTimeoutMillis > 10000
                || readTimeoutMillis < 1 || readTimeoutMillis > 15000
                || !isCanonicalBase64Url(vapidPublicKey) || !isCanonicalBase64Url(vapidPrivateKey)) {
            throw new IllegalStateException("Web push VAPID transport configuration is invalid.");
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        byte[] publicKey = Base64.getUrlDecoder().decode(vapidPublicKey);
        byte[] privateKey = Base64.getUrlDecoder().decode(vapidPrivateKey);
        if (publicKey.length != 65 || publicKey[0] != 4 || privateKey.length != 32) {
            throw new IllegalStateException("Web push VAPID key configuration is invalid.");
        }
    }

    @Override
    public void send(String endpoint, String p256dh, String auth, String payload) throws TransportException {
        URI destination = validateEndpoint(endpoint);
        HttpPost request = prepareRequest(destination, p256dh, auth, payload);
        HttpURLConnection connection = null;
        try {
            connection = connectionFactory.open(destination.toURL());
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(connectTimeoutMillis);
            connection.setReadTimeout(readTimeoutMillis);
            connection.setInstanceFollowRedirects(false);
            connection.setDoOutput(true);
            for (Header header : request.getAllHeaders()) {
                String name = header.getName();
                if (!"Host".equalsIgnoreCase(name) && !"Content-Length".equalsIgnoreCase(name)) {
                    connection.setRequestProperty(name, header.getValue());
                }
            }
            HttpEntity entity = request.getEntity();
            long contentLength = entity.getContentLength();
            if (contentLength >= 0 && contentLength <= Integer.MAX_VALUE) {
                connection.setFixedLengthStreamingMode((int) contentLength);
            }
            try (OutputStream output = connection.getOutputStream()) {
                entity.writeTo(output);
            }
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw classify(status, connection.getHeaderField("Retry-After"));
            }
        } catch (TransportException error) {
            throw error;
        } catch (IOException error) {
            throw new TransportException(FailureKind.TRANSIENT, "NETWORK_ERROR", 0, null);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private HttpPost prepareRequest(URI endpoint, String p256dh, String auth, String payload)
            throws TransportException {
        try {
            Notification notification = new Notification(endpoint.toString(), p256dh, auth,
                    payload.getBytes(StandardCharsets.UTF_8), MAX_TTL_SECONDS);
            PushService pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            return pushService.preparePost(notification, Encoding.AES128GCM);
        } catch (java.security.GeneralSecurityException | JoseException | IOException error) {
            throw new TransportException(FailureKind.PERMANENT, "REQUEST_PREPARATION_FAILED", 0, null);
        }
    }

    private URI validateEndpoint(String endpoint) throws TransportException {
        try {
            URI uri = new URI(endpoint);
            String host = uri.getHost();
            String normalizedHost = host == null ? "" : host.toLowerCase(Locale.ROOT);
            boolean allowedHost = "fcm.googleapis.com".equals(normalizedHost)
                    || normalizedHost.endsWith(".push.services.mozilla.com")
                    || "web.push.apple.com".equals(normalizedHost)
                    || normalizedHost.endsWith(".notify.windows.com");
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !allowedHost
                    || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                    || uri.getRawFragment() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || uri.getRawPath() == null || uri.getRawPath().isEmpty()) {
                throw new URISyntaxException("", "Invalid push destination");
            }
            return uri;
        } catch (URISyntaxException | NullPointerException error) {
            throw new TransportException(FailureKind.PERMANENT, "INVALID_ENDPOINT", 0, null);
        }
    }

    private TransportException classify(int status, String retryAfter) {
        if (status == 404 || status == 410) {
            return new TransportException(FailureKind.SUBSCRIPTION_GONE,
                    status == 404 ? "HTTP_404" : "HTTP_410", status, null);
        }
        if (status == 408 || status == 429 || status >= 500) {
            String code = status >= 500 ? "HTTP_5XX" : "HTTP_" + status;
            return new TransportException(FailureKind.TRANSIENT, code, status, parseRetryAfter(retryAfter));
        }
        return new TransportException(FailureKind.PERMANENT, "HTTP_" + status, status, null);
    }

    private Long parseRetryAfter(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            long seconds = Long.parseLong(value.trim());
            return seconds < 0 ? null : Long.valueOf(Math.min(seconds, MAX_RETRY_AFTER_SECONDS));
        } catch (NumberFormatException ignored) {
            try {
                long seconds = Duration.between(Instant.now(), ZonedDateTime.parse(value,
                        DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).getSeconds();
                return seconds < 0 ? null : Long.valueOf(Math.min(seconds, MAX_RETRY_AFTER_SECONDS));
            } catch (RuntimeException invalidDate) {
                return null;
            }
        }
    }

    private boolean isCanonicalBase64Url(String value) {
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(value);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(decoded).equals(value);
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    interface ConnectionFactory {
        HttpURLConnection open(URL url) throws IOException;
    }
}
