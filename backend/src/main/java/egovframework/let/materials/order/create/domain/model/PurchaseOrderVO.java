package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주 헤더와 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseOrderId;
    private String orderNo;
    private LocalDate orderDt;
    private Long supplierId;
    private String supplierCode;
    private String supplierName;
    private String ordererName;
    private String currencyCode;
    private String sourceType;
    private String taxType;
    private String vatIncludedAt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String printAt;
    private String remark;
    private String useAt;
    private List<PurchaseOrderDetailVO> details;
    private List<Integer> overOrderedLineNos;
}
