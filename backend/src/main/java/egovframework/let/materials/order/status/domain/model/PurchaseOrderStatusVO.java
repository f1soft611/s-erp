package egovframework.let.materials.order.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주현황 목록(품목 행 단위) 조회 결과 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseOrderId;
    private Long purchaseOrderDetailId;
    private String orderNo;
    private LocalDate orderDt;
    private String supplierName;
    private String ordererName;
    private String status;
    private String sourceType;
    private String taxType;
    private String taxTypeName;
    private String vatIncludedAt;
    private BigDecimal headerSupplyAmt;
    private BigDecimal headerVatAmt;
    private BigDecimal headerTotalAmt;
    private String headerRemark;
    private Integer lineNo;
    private String confirmNo;
    private String requestNo;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal orderQty;
    private BigDecimal unitPrice;
    private LocalDate deliveryDt;
    private String warehouseName;
    private String inspectAt;
    private String receiptCloseAt;
    private String printAt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String orderTypeName;
    private String useTypeName;
    private String remark;
}
