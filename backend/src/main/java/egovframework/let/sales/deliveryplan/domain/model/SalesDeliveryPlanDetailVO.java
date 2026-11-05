package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanDetailVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryPlanDetailId;
    private Long salesDeliveryPlanId;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String unit;
    private Integer lineNo;
    private LocalDate planDt;
    private BigDecimal plannedQty;
    private BigDecimal deliveredQty;
    private BigDecimal remainingQty;
    private BigDecimal orderQty;
    private BigDecimal shippedQty;
}
