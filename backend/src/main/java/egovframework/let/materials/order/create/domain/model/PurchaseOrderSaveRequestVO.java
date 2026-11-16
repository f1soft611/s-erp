package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 요청 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String sourceType;
    private LocalDate orderDt;
    private Long supplierId;
    private String currencyCode;
    private Long warehouseId;
    private String taxType;
    private String vatIncludedAt;
    private String remark;
    private String orderType;
    private String useType;
    private List<PurchaseOrderDetailSaveRequestVO> details;
}
