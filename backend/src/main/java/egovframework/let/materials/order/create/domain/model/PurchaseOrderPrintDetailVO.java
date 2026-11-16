package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주서 출력 상세 행(품목, 수량, 단가, 금액, 행별 납기일)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderPrintDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer lineNo;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal orderQty;
    private BigDecimal unitPrice;
    private LocalDate deliveryDt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String remark;
}
