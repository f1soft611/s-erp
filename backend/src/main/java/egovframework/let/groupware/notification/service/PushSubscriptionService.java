package egovframework.let.groupware.notification.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionStatusVO;

public interface PushSubscriptionService {

    PushSubscriptionStatusVO getStatus(LoginVO user, String endpointHash) throws Exception;

    Long register(LoginVO user, PushSubscriptionRequestVO request) throws Exception;

    void unsubscribe(LoginVO user, Long subscriptionId) throws Exception;
}
