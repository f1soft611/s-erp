package egovframework.let.materials.request.status.service;

import java.util.List;

import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusSearchVO;
import egovframework.let.materials.request.status.domain.model.PurchaseRequestStatusVO;

/**
 * 구매요청현황 조회 서비스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
public interface PurchaseRequestStatusService {

    /** 테넌트 범위에서 검색 조건에 맞는 구매요청현황을 조회한다. */
    List<PurchaseRequestStatusVO> selectRequestStatusList(Long tenantId, PurchaseRequestStatusSearchVO search)
            throws Exception;
}
