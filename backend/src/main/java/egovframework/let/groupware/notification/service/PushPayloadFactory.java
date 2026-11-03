package egovframework.let.groupware.notification.service;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
public class PushPayloadFactory {

    private final ObjectMapper objectMapper;

    public PushPayloadFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String create(Long notificationId, String eventType) {
        validateNotificationId(notificationId);
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("notificationId", notificationId.longValue());
        payload.put("kind", "notification");
        payload.put("category", "DIRECT_MESSAGE_RECEIVED".equals(eventType) ? "message" : "work");
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Unable to serialize web push payload.", error);
        }
    }

    private void validateNotificationId(Long notificationId) {
        if (notificationId == null || notificationId.longValue() <= 0) {
            throw new IllegalArgumentException("A positive notification ID is required.");
        }
    }
}
