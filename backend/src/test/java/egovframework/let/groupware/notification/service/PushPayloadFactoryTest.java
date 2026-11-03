package egovframework.let.groupware.notification.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class PushPayloadFactoryTest {

    private final PushPayloadFactory factory = new PushPayloadFactory(new ObjectMapper());

    @Test
    void createsExactlyNotificationIdAndKindWithoutAnUrl() throws Exception {
        assertThat(factory.create(123L))
                .isEqualTo("{\"notificationId\":123,\"kind\":\"notification\"}");
        assertThat(factory.create(123L))
                .doesNotContain("url", "title", "summary", "content", "endpoint", "secret");
    }

    @Test
    void rejectsNonPositiveNotificationId() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> factory.create(0L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
