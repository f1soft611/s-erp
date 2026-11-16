package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 시 잠그는 확정 품목 행 상태를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderConfirmRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestDetailId;
    private Long purchaseConfirmId;
    private String confirmUseAt;
    private Long materialId;
    private String materialTypeCode;
    private String inspectAt;
    private BigDecimal confirmQty;
    private BigDecimal orderedQty;
    private String orderCloseAt;
    private Long supplierId;
    private String currencyCode;
    private String orderType;
    private String useType;
    private Long warehouseId;
    private LocalDate confirmDeliveryDt;
}
