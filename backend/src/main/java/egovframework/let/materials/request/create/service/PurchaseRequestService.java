package egovframework.let.materials.request.create.service;

import egovframework.let.materials.request.create.domain.model.PurchaseRequestSaveRequestVO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestVO;

/**
 * 구매요청 등록/조회/수정/삭제 서비스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
public interface PurchaseRequestService {

    /** 로그인 사용자를 요청자로 구매요청을 등록한다. */
    PurchaseRequestVO createRequest(Long tenantId, String userId, PurchaseRequestSaveRequestVO payload)
            throws Exception;

    /** 테넌트 범위에서 구매요청 헤더와 상세를 조회한다. */
    PurchaseRequestVO getRequest(Long tenantId, Long purchaseRequestId) throws Exception;

    /** 요청 상태의 구매요청을 수정한다. */
    PurchaseRequestVO updateRequest(Long tenantId, String userId, Long purchaseRequestId,
            PurchaseRequestSaveRequestVO payload) throws Exception;

    /** 요청 상태의 구매요청을 미사용 처리한다. */
    void deleteRequest(Long tenantId, String userId, Long purchaseRequestId) throws Exception;
}
