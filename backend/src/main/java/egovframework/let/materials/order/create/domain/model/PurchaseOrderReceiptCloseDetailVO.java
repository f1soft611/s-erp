package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 입고대기 마감 저장 요청의 상세 행(발주 행 ID, 마감 값)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderReceiptCloseDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseOrderDetailId;
    /** Y 마감 / N 마감 취소 */
    private String receiptCloseAt;
}
