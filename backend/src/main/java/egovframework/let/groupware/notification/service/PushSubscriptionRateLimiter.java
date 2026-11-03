package egovframework.let.groupware.notification.service;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PushSubscriptionRateLimiter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MILLIS = 60_000L;

    private final Clock clock;
    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<String, Window>();
    private final AtomicInteger requestCount = new AtomicInteger();

    public PushSubscriptionRateLimiter() {
        this(Clock.systemUTC());
    }

    PushSubscriptionRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public void check(long tenantId, long userId) {
        if (tenantId <= 0 || userId <= 0) {
            throw new IllegalArgumentException("A valid subscription owner is required.");
        }
        long minute = clock.millis() / WINDOW_MILLIS;
        String key = tenantId + ":" + userId;
        Window window = windows.computeIfAbsent(key, ignored -> new Window(minute));
        synchronized (window) {
            if (window.minute != minute) {
                window.minute = minute;
                window.count = 0;
            }
            if (window.count >= MAX_REQUESTS_PER_MINUTE) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "웹 푸시 요청 한도를 초과했습니다.");
            }
            window.count++;
        }
        if ((requestCount.incrementAndGet() & 63) == 0) {
            for (Map.Entry<String, Window> entry : windows.entrySet()) {
                if (entry.getValue().minute < minute - 1) {
                    windows.remove(entry.getKey(), entry.getValue());
                }
            }
        }
    }

    private static final class Window {
        private long minute;
        private int count;

        private Window(long minute) {
            this.minute = minute;
        }
    }
}
