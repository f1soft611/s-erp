package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanDetailRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryPlanDetailId;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private LocalDate planDt;
    private BigDecimal plannedQty;
}
