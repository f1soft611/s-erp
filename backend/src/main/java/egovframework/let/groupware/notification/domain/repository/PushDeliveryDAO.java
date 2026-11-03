package egovframework.let.groupware.notification.domain.repository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.notification.domain.model.PushDeliveryVO;
import egovframework.let.groupware.notification.domain.model.PushOutboxVO;

@Repository("pushDeliveryDAO")
public class PushDeliveryDAO extends EgovAbstractMapper {

    public int insertOutbox(PushOutboxVO outbox) throws Exception {
        return insert("PushDeliveryDAO.insertOutbox", outbox);
    }

    public List<PushOutboxVO> claimOutboxes(UUID leaseToken, LocalDateTime leaseUntil, Integer limit)
            throws Exception {
        Map<String, Object> params = claimParams(leaseToken, leaseUntil, limit);
        return selectList("PushDeliveryDAO.claimOutboxes", params);
    }

    public int markOutboxExpanded(Long outboxId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markOutboxExpanded", leaseParams(outboxId, leaseToken));
    }

    public int markOutboxNoRecipient(Long outboxId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markOutboxNoRecipient", leaseParams(outboxId, leaseToken));
    }

    public int markOutboxCompleted(Long outboxId) throws Exception {
        return update("PushDeliveryDAO.markOutboxCompleted", idParams(outboxId));
    }

    public int markOutboxFailed(Long outboxId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markOutboxFailed", leaseParams(outboxId, leaseToken));
    }

    public int insertDelivery(PushDeliveryVO delivery) throws Exception {
        return insert("PushDeliveryDAO.insertDelivery", delivery);
    }

    public int suppressInactiveDeliveries(Long outboxId) throws Exception {
        return update("PushDeliveryDAO.suppressInactiveDeliveries", outboxId);
    }

    public List<PushDeliveryVO> claimDeliveries(UUID leaseToken, LocalDateTime leaseUntil, Integer limit)
            throws Exception {
        Map<String, Object> params = claimParams(leaseToken, leaseUntil, limit);
        return selectList("PushDeliveryDAO.claimDeliveries", params);
    }

    public int markDeliverySent(Long deliveryId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markDeliverySent", leaseParams(deliveryId, leaseToken));
    }

    public int scheduleDeliveryRetry(Long deliveryId, UUID leaseToken, LocalDateTime nextAttemptAt,
            String errorCode) throws Exception {
        Map<String, Object> params = leaseParams(deliveryId, leaseToken);
        params.put("nextAttemptAt", nextAttemptAt);
        params.put("errorCode", errorCode);
        return update("PushDeliveryDAO.scheduleDeliveryRetry", params);
    }

    public int markDeliveryPermanentFailure(Long deliveryId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markDeliveryPermanentFailure", leaseParams(deliveryId, leaseToken));
    }

    public int markDeliveryExhausted(Long deliveryId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markDeliveryExhausted", leaseParams(deliveryId, leaseToken));
    }

    public int markDeliverySuppressed(Long deliveryId, UUID leaseToken) throws Exception {
        return update("PushDeliveryDAO.markDeliverySuppressed", leaseParams(deliveryId, leaseToken));
    }

    private static Map<String, Object> claimParams(UUID leaseToken, LocalDateTime leaseUntil, Integer limit) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("leaseToken", leaseToken);
        params.put("leaseUntil", leaseUntil);
        params.put("limit", limit);
        return params;
    }

    private static Map<String, Object> leaseParams(Long id, UUID leaseToken) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("id", id);
        params.put("leaseToken", leaseToken);
        return params;
    }

    private static Map<String, Object> idParams(Long id) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("id", id);
        return params;
    }
}
