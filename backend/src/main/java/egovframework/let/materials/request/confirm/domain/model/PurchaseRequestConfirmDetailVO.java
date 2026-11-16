package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 화면의 상세 행(구매요청·요청 상세·확정 정보)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseRequestConfirmDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestId;
    private String requestNo;
    private LocalDate requestDt;
    private String requesterName;
    private String requestDeptName;
    private Long purchaseRequestDetailId;
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal requestQty;
    private LocalDate requestDeliveryDt;
    private String useType;
    private String useTypeName;
    private String requestRemark;
    private BigDecimal confirmQty;
    private LocalDate confirmDeliveryDt;
    private Long warehouseId;
    private String warehouseName;
    private String orderType;
    private String orderTypeName;
    private Long supplierId;
    private String supplierCode;
    private String supplierName;
    private BigDecimal unitPrice;
    private String currencyCode;
    private BigDecimal amount;
    private String confirmRemark;
    private String orderCloseAt;
}
