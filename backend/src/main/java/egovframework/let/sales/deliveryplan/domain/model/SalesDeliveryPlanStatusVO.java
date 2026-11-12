package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanStatusVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryPlanId;
    private Long salesDeliveryPlanDetailId;
    private String planNo;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private String orderNo;
    private String orderDt;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String unit;
    private Integer lineNo;
    private LocalDate planDt;
    private BigDecimal orderQty;
    private BigDecimal plannedQty;
    private BigDecimal deliveredQty;
    private BigDecimal remainingQty;
}
