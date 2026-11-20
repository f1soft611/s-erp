package egovframework.let.materials.request.confirm.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmListItemVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmCandidateVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseUnitPriceVO;

/**
 * 구매요청 품목 행 묶음 확정·발주대기 마감·확정 취소 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
public interface PurchaseRequestConfirmService {

    List<PurchaseRequestConfirmCandidateVO> listCandidates(Long tenantId, String keyword, LocalDate fromDt, LocalDate toDt)
            throws Exception;

    /**
     * 확정할 품목 행을 조회하고, 확정되지 않은 행에는 품목의 기본 거래처와 그 거래처의 기준일 단가·발주구분을 채운다.
     *
     * @param baseDt 단가 기준일(null이면 서버 오늘)
     */
    List<PurchaseRequestConfirmDetailVO> loadRequestDetails(Long tenantId, List<Long> purchaseRequestDetailIds,
            LocalDate baseDt) throws Exception;

    List<PurchaseConfirmListItemVO> listConfirms(Long tenantId, String keyword, String status, LocalDate fromDt,
            LocalDate toDt) throws Exception;

    PurchaseConfirmVO getConfirm(Long tenantId, Long purchaseConfirmId) throws Exception;

    PurchaseConfirmVO createConfirm(Long tenantId, String userId, PurchaseRequestConfirmRequestVO payload)
            throws Exception;

    PurchaseConfirmVO saveOrderClose(Long tenantId, String userId, Long purchaseConfirmId,
            PurchaseRequestOrderCloseRequestVO payload) throws Exception;

    PurchaseConfirmVO cancelConfirm(Long tenantId, String userId, Long purchaseConfirmId) throws Exception;

    PurchaseUnitPriceVO findDefaultUnitPrice(Long tenantId, Long materialId, Long supplierId, LocalDate baseDt)
            throws Exception;
}
