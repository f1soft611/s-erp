package egovframework.let.groupware.notification.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class PushPayloadFactoryTest {

    private final PushPayloadFactory factory = new PushPayloadFactory(new ObjectMapper());

    @Test
    void distinguishesMessageAndWorkWithoutIncludingBusinessContent() throws Exception {
        assertThat(factory.create(123L, "DIRECT_MESSAGE_RECEIVED"))
                .isEqualTo("{\"notificationId\":123,\"kind\":\"notification\",\"category\":\"message\"}");
        assertThat(factory.create(123L, "APPROVAL_COMMENT_MENTION"))
                .isEqualTo("{\"notificationId\":123,\"kind\":\"notification\",\"category\":\"work\"}");
    }

    @Test
    void createsOnlySafeMetadataWithoutAnUrl() throws Exception {
        assertThat(factory.create(123L, null))
                .isEqualTo("{\"notificationId\":123,\"kind\":\"notification\",\"category\":\"work\"}");
        assertThat(factory.create(123L, null))
                .doesNotContain("url", "title", "summary", "content", "endpoint", "secret");
    }

    @Test
    void rejectsNonPositiveNotificationId() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> factory.create(0L, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
