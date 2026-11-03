package egovframework.let.groupware.notification.service;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
public class PushPayloadFactory {

    private static final String APPLICATION_ROUTE = "/groupware/notifications?pushNotificationId=";

    private final ObjectMapper objectMapper;

    public PushPayloadFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String create(Long notificationId) {
        validateNotificationId(notificationId);
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("notificationId", notificationId.longValue());
        payload.put("kind", "notification");
        payload.put("url", getApplicationRoute(notificationId));
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Unable to serialize web push payload.", error);
        }
    }

    public String getApplicationRoute(Long notificationId) {
        validateNotificationId(notificationId);
        return APPLICATION_ROUTE + notificationId;
    }

    private void validateNotificationId(Long notificationId) {
        if (notificationId == null || notificationId.longValue() <= 0) {
            throw new IllegalArgumentException("A positive notification ID is required.");
        }
    }
}
