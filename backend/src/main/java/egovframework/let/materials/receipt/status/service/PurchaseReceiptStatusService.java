package egovframework.let.materials.receipt.status.service;

import java.util.List;

import egovframework.let.materials.receipt.status.domain.model.PurchaseReceiptStatusSearchVO;
import egovframework.let.materials.receipt.status.domain.model.PurchaseReceiptStatusVO;

/**
 * 입고현황 조회 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface PurchaseReceiptStatusService {

    /** 검색 조건에 맞는 입고 품목 행을 조회한다. 상태 조건이 없으면 정상(ACTIVE)만 조회한다. */
    List<PurchaseReceiptStatusVO> selectReceiptStatusList(Long tenantId, PurchaseReceiptStatusSearchVO search)
            throws Exception;
}
