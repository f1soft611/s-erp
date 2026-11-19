package egovframework.let.materials.arrival.status.service;

import java.util.List;

import egovframework.let.materials.arrival.status.domain.model.PurchaseArrivalStatusSearchVO;
import egovframework.let.materials.arrival.status.domain.model.PurchaseArrivalStatusVO;

/**
 * 가입고현황 조회 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
public interface PurchaseArrivalStatusService {

    List<PurchaseArrivalStatusVO> selectArrivalStatusList(Long tenantId, PurchaseArrivalStatusSearchVO search)
            throws Exception;
}
