package egovframework.let.materials.order.status.service;

import java.util.List;

import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusSearchVO;
import egovframework.let.materials.order.status.domain.model.PurchaseOrderStatusVO;

/**
 * 발주현황 조회 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
public interface PurchaseOrderStatusService {

    List<PurchaseOrderStatusVO> selectOrderStatusList(Long tenantId, PurchaseOrderStatusSearchVO search)
            throws Exception;
}
