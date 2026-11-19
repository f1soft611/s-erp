package egovframework.let.materials.arrival.create.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalCandidateVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalSaveRequestVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalVO;

/**
 * 가입고 후보 조회와 가입고 등록·수정·취소 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
public interface PurchaseArrivalService {

    /** 발주 유효·입고대기 마감 아님·잔량 > 0인 발주 품목 행을 조회한다. 기간은 발주일 기준이다. */
    List<PurchaseArrivalCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt, String keyword)
            throws Exception;

    PurchaseArrivalVO createArrival(Long tenantId, String userId, PurchaseArrivalSaveRequestVO payload)
            throws Exception;

    PurchaseArrivalVO getArrival(Long tenantId, Long purchaseArrivalId) throws Exception;

    /** 가입고일·부가세·비고와 기존 행의 값을 수정하고, 요청에 없는 행은 삭제한다. */
    PurchaseArrivalVO updateArrival(Long tenantId, String userId, Long purchaseArrivalId,
            PurchaseArrivalSaveRequestVO payload) throws Exception;

    /** 가입고 전체를 취소한다(이력 보존). 발주 잔량은 유효 가입고 합으로 계산하므로 자동 복원된다. */
    PurchaseArrivalVO cancelArrival(Long tenantId, String userId, Long purchaseArrivalId) throws Exception;
}
