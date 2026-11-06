package egovframework.let.sales.deliveryplan.service;

import java.util.List;

import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanStatusSearchVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanVO;

public interface SalesDeliveryPlanService {
    String getMode(Long tenantId) throws Exception;

    /**
     * 납품계획 헤더를 생성할 수 있는 트랜잭션에서 수주 잠금보다 먼저 호출해 테넌트 운영모드를 공유 잠금으로 읽는다.
     */
    String lockModeForPlanCreation(Long tenantId) throws Exception;

    String getOverDeliveryPolicy(Long tenantId) throws Exception;

    List<SalesDeliverySourceOrderVO> listSourceOrders(Long tenantId, String keyword) throws Exception;

    SalesDeliveryPlanVO create(Long tenantId, String userId, SalesDeliveryPlanRequestVO request) throws Exception;

    void createAutomaticPlan(Long tenantId, String userId, SalesDeliveryPlanRequestVO request) throws Exception;

    void synchronizeAutomaticPlan(Long tenantId, String userId, Long salesOrderId,
            List<Long> retainedOrderDetailIds) throws Exception;

    SalesDeliveryPlanVO get(Long tenantId, String userId, Long planId) throws Exception;

    SalesDeliveryPlanVO update(Long tenantId, String userId, Long planId, SalesDeliveryPlanRequestVO request)
            throws Exception;

    List<SalesDeliveryPlanVO> listStatus(Long tenantId, String userId, SalesDeliveryPlanStatusSearchVO search)
            throws Exception;
}
