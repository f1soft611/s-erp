package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryPlanId;
    private Long tenantId;
    private String planNo;
    private Long salesOrderId;
    private String orderNo;
    private String orderDt;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private String createdBy;
    private List<SalesDeliveryPlanDetailVO> details;
}
