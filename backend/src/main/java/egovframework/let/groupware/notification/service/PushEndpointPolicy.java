package egovframework.let.groupware.notification.service;

import java.math.BigInteger;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.ECFieldFp;
import java.util.Base64;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;

@Component
public class PushEndpointPolicy {

    private final HostResolver hostResolver;

    public PushEndpointPolicy() {
        this(InetAddress::getAllByName);
    }

    PushEndpointPolicy(HostResolver hostResolver) {
        this.hostResolver = hostResolver;
    }

    public void validate(PushSubscriptionRequestVO request) {
        if (request == null || !StringUtils.hasText(request.getEndpoint())
                || request.getEndpoint().length() > 2048 || request.getKeys() == null) {
            throw invalidEndpoint();
        }
        validateKeys(request.getKeys().getP256dh(), request.getKeys().getAuth());
        URI endpoint = parseEndpoint(request.getEndpoint());
        validateHost(endpoint.getHost());
        validateResolvedAddresses(endpoint.getHost());
    }

    private URI parseEndpoint(String value) {
        try {
            URI endpoint = new URI(value);
            if (!"https".equalsIgnoreCase(endpoint.getScheme())
                    || !StringUtils.hasText(endpoint.getHost())
                    || endpoint.getRawUserInfo() != null
                    || endpoint.getRawQuery() != null
                    || endpoint.getRawFragment() != null
                    || (endpoint.getPort() != -1 && endpoint.getPort() != 443)
                    || !StringUtils.hasText(endpoint.getRawPath())) {
                throw invalidEndpoint();
            }
            return endpoint;
        } catch (URISyntaxException error) {
            throw invalidEndpoint();
        }
    }

    private void validateHost(String host) {
        String normalized = host.toLowerCase(java.util.Locale.ROOT);
        boolean allowed = "fcm.googleapis.com".equals(normalized)
                || normalized.endsWith(".push.services.mozilla.com")
                || "web.push.apple.com".equals(normalized)
                || normalized.endsWith(".notify.windows.com");
        if (!allowed) {
            throw invalidEndpoint();
        }
    }

    private void validateResolvedAddresses(String host) {
        try {
            InetAddress[] addresses = hostResolver.resolve(host);
            if (addresses == null || addresses.length == 0) {
                throw invalidEndpoint();
            }
            for (InetAddress address : addresses) {
                if (address == null || !isPublicAddress(address)) {
                    throw invalidEndpoint();
                }
            }
        } catch (UnknownHostException error) {
            throw invalidEndpoint();
        }
    }

    private void validateKeys(String p256dh, String auth) {
        byte[] publicKey = decode(p256dh, 65);
        if (publicKey[0] != 4) {
            throw invalidEndpoint();
        }
        decode(auth, 16);
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            ECParameterSpec curve = parameters.getParameterSpec(ECParameterSpec.class);
            BigInteger x = new BigInteger(1, java.util.Arrays.copyOfRange(publicKey, 1, 33));
            BigInteger y = new BigInteger(1, java.util.Arrays.copyOfRange(publicKey, 33, 65));
            if (!(curve.getCurve().getField() instanceof ECFieldFp)) {
                throw invalidEndpoint();
            }
            BigInteger prime = ((ECFieldFp) curve.getCurve().getField()).getP();
            if (x.compareTo(prime) >= 0 || y.compareTo(prime) >= 0) {
                throw invalidEndpoint();
            }
            BigInteger left = y.multiply(y).mod(prime);
            BigInteger right = x.multiply(x).multiply(x)
                    .add(curve.getCurve().getA().multiply(x))
                    .add(curve.getCurve().getB())
                    .mod(prime);
            if (!left.equals(right)) {
                throw invalidEndpoint();
            }
            KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(
                    new java.security.spec.ECPoint(x, y), curve));
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw invalidEndpoint();
        }
    }

    private byte[] decode(String value, int expectedLength) {
        if (value == null || value.length() > 90 || !value.matches("[A-Za-z0-9_-]+")) {
            throw invalidEndpoint();
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(value);
            if (decoded.length != expectedLength
                    || !Base64.getUrlEncoder().withoutPadding().encodeToString(decoded).equals(value)) {
                throw invalidEndpoint();
            }
            return decoded;
        } catch (IllegalArgumentException error) {
            throw invalidEndpoint();
        }
    }

    private boolean isPublicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress()
                || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            int third = bytes[2] & 0xff;
            return !(first == 0 || first == 10 || first == 127
                    || (first == 100 && second >= 64 && second <= 127)
                    || (first == 169 && second == 254)
                    || (first == 172 && second >= 16 && second <= 31)
                    || (first == 192 && second == 0 && third == 0)
                    || (first == 192 && second == 168)
                    || (first == 192 && second == 88 && third == 99)
                    || (first == 192 && second == 0 && third == 2)
                    || (first == 198 && (second == 18 || second == 19))
                    || (first == 198 && second == 51 && third == 100)
                    || (first == 203 && second == 0 && third == 113)
                    || first >= 224);
        }
        if (address instanceof Inet6Address) {
            if ((bytes[0] & 0xfe) == 0xfc
                    || (bytes[0] == 0x20 && bytes[1] == 0x01
                    && (bytes[2] & 0xff) == 0x0d && (bytes[3] & 0xff) == 0xb8)) {
                return false;
            }
            boolean ipv4Mapped = true;
            for (int index = 0; index < 10; index++) {
                ipv4Mapped &= bytes[index] == 0;
            }
            ipv4Mapped &= (bytes[10] & 0xff) == 0xff && (bytes[11] & 0xff) == 0xff;
            if (ipv4Mapped) {
                try {
                    return isPublicAddress(InetAddress.getByAddress(
                            java.util.Arrays.copyOfRange(bytes, 12, 16)));
                } catch (UnknownHostException error) {
                    return false;
                }
            }
            return (bytes[0] & 0xe0) == 0x20;
        }
        return false;
    }

    private ResponseStatusException invalidEndpoint() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "웹 푸시 구독 정보가 올바르지 않습니다.");
    }

    interface HostResolver {
        InetAddress[] resolve(String host) throws UnknownHostException;
    }
}
