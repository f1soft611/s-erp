package egovframework.let.groupware.notification.service;

public interface PushDeliveryService {

    void enqueue(Long notificationId) throws Exception;

    int expandDueOutboxes() throws Exception;

    int deliverDueNotifications() throws Exception;
}
