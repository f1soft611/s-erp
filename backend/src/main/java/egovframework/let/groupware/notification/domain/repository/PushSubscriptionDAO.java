package egovframework.let.groupware.notification.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.notification.domain.model.PushSubscriptionVO;

@Repository("pushSubscriptionDAO")
public class PushSubscriptionDAO extends EgovAbstractMapper {

    public int upsertSubscription(PushSubscriptionVO subscription) throws Exception {
        return insert("PushSubscriptionDAO.upsertSubscription", subscription);
    }

    public int deactivateSubscription(Long tenantId, Long userId, Long subscriptionId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        params.put("subscriptionId", subscriptionId);
        return update("PushSubscriptionDAO.deactivateSubscription", params);
    }

    public List<PushSubscriptionVO> selectActiveSubscriptions(Long tenantId, Long userId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        return selectList("PushSubscriptionDAO.selectActiveSubscriptions", params);
    }

    public Long countActiveSubscriptions(Long tenantId, Long userId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        return selectOne("PushSubscriptionDAO.countActiveSubscriptions", params);
    }
}
