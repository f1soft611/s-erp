package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 확정 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseRequestConfirmDetailRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestDetailId;
    private BigDecimal confirmQty;
    private LocalDate confirmDeliveryDt;
    private Long warehouseId;
    private String orderType;
    private Long supplierId;
    private BigDecimal unitPrice;
    private String currencyCode;
    private String confirmRemark;
}
