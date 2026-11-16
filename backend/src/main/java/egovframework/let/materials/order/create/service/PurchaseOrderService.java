package egovframework.let.materials.order.create.service;

import java.time.LocalDate;
import java.util.List;

import egovframework.let.materials.order.create.domain.model.PurchaseOrderCandidateVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderMaterialDefaultVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;

/**
 * 발주 후보 조회와 발주 등록(확정 불러오기, 직접 발주) 서비스 인터페이스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
public interface PurchaseOrderService {

    List<PurchaseOrderCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt, String keyword)
            throws Exception;

    PurchaseOrderMaterialDefaultVO getMaterialDefault(Long tenantId, Long materialId) throws Exception;

    PurchaseOrderVO createOrder(Long tenantId, String userId, PurchaseOrderSaveRequestVO payload) throws Exception;

    PurchaseOrderVO getOrder(Long tenantId, Long purchaseOrderId) throws Exception;

    /** 발주일·부가세·비고와 기존 행의 값을 수정하고, 요청에 없는 행은 삭제한다. */
    PurchaseOrderVO updateOrder(Long tenantId, String userId, Long purchaseOrderId, PurchaseOrderSaveRequestVO payload)
            throws Exception;

    /** 발주서 출력 데이터를 조회한다. 취소된 발주는 출력할 수 없다(409). */
    PurchaseOrderPrintVO getPrintData(Long tenantId, Long purchaseOrderId) throws Exception;

    /** 인쇄 버튼을 눌렀을 때 출력했다고 기록한다. 취소된 발주는 409. */
    PurchaseOrderVO markPrinted(Long tenantId, String userId, Long purchaseOrderId) throws Exception;

    /** 입고대기 마감만 저장한다. 수량·단가 등 다른 값은 바꾸지 않는다. */
    PurchaseOrderVO saveReceiptClose(Long tenantId, String userId, Long purchaseOrderId,
            PurchaseOrderReceiptCloseRequestVO payload) throws Exception;

    /** 발주서 전체를 취소한다. 직접 발주는 자동 생성된 확정·구매요청도 함께 정리한다. */
    PurchaseOrderVO cancelOrder(Long tenantId, String userId, Long purchaseOrderId) throws Exception;
}
