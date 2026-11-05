package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryDetailVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryDetailId;
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String unit;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private Long salesDeliveryPlanDetailId;
    private BigDecimal deliveryQty;
    private BigDecimal unitPrice;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
}
