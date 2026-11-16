package egovframework.let.sales.shipment.delivery.service;

import java.util.List;

import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryRequestVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryStatusSearchVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryStatusVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryVO;

public interface SalesDeliveryService {
    SalesDeliveryVO createDelivery(Long tenantId, String userId, SalesDeliveryRequestVO payload)
            throws Exception;

    SalesDeliveryVO getDelivery(Long tenantId, String userId, Long salesDeliveryId) throws Exception;

    SalesDeliveryVO updateDelivery(Long tenantId, String userId, Long salesDeliveryId,
            SalesDeliveryRequestVO payload) throws Exception;

    void deleteDelivery(Long tenantId, String userId, Long salesDeliveryId) throws Exception;

    List<SalesDeliverySourceOrderVO> listSourceOrders(Long tenantId, String keyword) throws Exception;

    List<SalesDeliveryStatusVO> listStatus(Long tenantId, String userId, SalesDeliveryStatusSearchVO search)
            throws Exception;
}
