package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 대상(확정 품목 행, 잔량 포함) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestDetailId;
    private String requestNo;
    private String confirmNo;
    private LocalDate confirmDt;
    private Long supplierId;
    private String supplierCode;
    private String supplierName;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private String materialTypeCode;
    private String inspectAt;
    private BigDecimal confirmQty;
    private BigDecimal orderedQty;
    private BigDecimal remainQty;
    private LocalDate requestDeliveryDt;
    private LocalDate confirmDeliveryDt;
    private Long warehouseId;
    private String warehouseName;
    private BigDecimal unitPrice;
    private String currencyCode;
    private String orderType;
    private String orderTypeName;
    private String useType;
    private String useTypeName;
    private String remark;
    private BigDecimal stockQty;
}
