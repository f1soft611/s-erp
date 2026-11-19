package egovframework.let.materials.receipt.create.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptCandidateVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;

/**
 * 입고 조회·수정·취소와 무검사 자동 입고 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
public interface PurchaseReceiptService {

    /**
     * 저장된 가입고의 무검사(inspect_at='N') 행으로 입고를 만든다. 가입고 저장과 같은 트랜잭션에서 호출한다.
     * 무검사 행이 없으면 아무것도 만들지 않고 null을 돌려준다.
     */
    PurchaseReceiptVO createFromArrival(Long tenantId, String userId, Long receiverId, Long receiverDeptId,
            PurchaseArrivalVO arrival) throws Exception;

    /** 입고 가능량(합격량 − 유효 입고 합)이 남은 정상 수입검사 행을 조회한다(불러오기 창). */
    List<PurchaseReceiptCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt, String keyword)
            throws Exception;

    /** 조회 조건과 무관하게 입고 가능량이 남은 수입검사 행의 전체 건수. */
    int countCandidates(Long tenantId) throws Exception;

    /**
     * 수입검사 합격분을 불러와 입고를 등록한다. 한 입고는 구매처 1곳·통화 1종이고,
     * 행의 입고수량은 입고 가능량을 넘을 수 없다.
     */
    PurchaseReceiptVO createReceipt(Long tenantId, String userId, PurchaseReceiptSaveRequestVO payload)
            throws Exception;

    PurchaseReceiptVO getReceipt(Long tenantId, Long purchaseReceiptId) throws Exception;

    /** 입고일·부가세·비고와 기존 행의 값을 수정하고 요청에 없는 행은 삭제한다. 무검사 행은 가입고에도 반영한다. */
    PurchaseReceiptVO updateReceipt(Long tenantId, String userId, Long purchaseReceiptId,
            PurchaseReceiptSaveRequestVO payload) throws Exception;

    /** 입고 전체를 취소한다(이력 보존). 무검사 행의 가입고 행은 함께 정리한다. */
    PurchaseReceiptVO cancelReceipt(Long tenantId, String userId, Long purchaseReceiptId) throws Exception;
}
