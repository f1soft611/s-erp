package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseOrderDetailId;
    private Integer lineNo;
    private Long purchaseRequestDetailId;
    private String requestNo;
    private String confirmNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal orderQty;
    private BigDecimal unitPrice;
    private LocalDate deliveryDt;
    private Long warehouseId;
    private String warehouseName;
    private String orderType;
    private String orderTypeName;
    private String useType;
    private String useTypeName;
    private String inspectAt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String receiptCloseAt;
    private String remark;
    /** 확정 기준값(화면의 "확정 대비" 표시용). remainQty는 이 행을 뺀 다른 유효 발주 수량을 제외한 잔량이다. */
    private BigDecimal confirmQty;
    private BigDecimal remainQty;
    private Long confirmSupplierId;
    private BigDecimal confirmUnitPrice;
    private LocalDate confirmDeliveryDt;
    private Long confirmWarehouseId;
}
