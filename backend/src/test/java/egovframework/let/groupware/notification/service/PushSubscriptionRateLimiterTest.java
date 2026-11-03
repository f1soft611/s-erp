package egovframework.let.groupware.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PushSubscriptionRateLimiterTest {

    @Test
    void allowsTenRequestsPerOwnerPerMinuteAndResetsOnTheNextWindow() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-03T10:00:00Z"));
        PushSubscriptionRateLimiter limiter = new PushSubscriptionRateLimiter(clock);

        for (int request = 0; request < 10; request++) {
            limiter.check(4L, 101L);
        }
        assertThatThrownBy(() -> limiter.check(4L, 101L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatus())
                                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

        limiter.check(4L, 102L);
        clock.advanceSeconds(60);
        limiter.check(4L, 101L);
    }

    private static final class MutableClock extends Clock {
        private final AtomicReference<Instant> instant;

        private MutableClock(Instant initial) {
            this.instant = new AtomicReference<Instant>(initial);
        }

        private void advanceSeconds(long seconds) {
            instant.updateAndGet(value -> value.plusSeconds(seconds));
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
