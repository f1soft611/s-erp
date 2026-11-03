package egovframework.let.groupware.notification.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PushDeliveryWorker {

    private final PushDeliveryService pushDeliveryService;

    public PushDeliveryWorker(PushDeliveryService pushDeliveryService) {
        this.pushDeliveryService = pushDeliveryService;
    }

    @Scheduled(fixedDelayString = "$" + "{WEB_PUSH_POLL_INTERVAL_MS:5000}")
    public void expandOutboxes() throws Exception {
        pushDeliveryService.expandDueOutboxes();
    }

    @Scheduled(fixedDelayString = "$" + "{WEB_PUSH_POLL_INTERVAL_MS:5000}")
    public void deliverNotifications() throws Exception {
        pushDeliveryService.deliverDueNotifications();
    }
}
