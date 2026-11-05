package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryDetailRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long materialId;
    private Long salesOrderDetailId;
    private Long salesDeliveryPlanDetailId;
    private BigDecimal deliveryQty;
    private BigDecimal unitPrice;
    private BigDecimal vatAmt;
}
