package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 수정 요청에서 기존 발주 행을 가리킨다. 등록 요청에서는 쓰지 않는다. */
    private Long purchaseOrderDetailId;
    private Long purchaseRequestDetailId;
    private Long materialId;
    private BigDecimal orderQty;
    private BigDecimal unitPrice;
    private LocalDate deliveryDt;
    private Long warehouseId;
    private String inspectAt;
    private BigDecimal vatAmt;
    private String remark;
}
