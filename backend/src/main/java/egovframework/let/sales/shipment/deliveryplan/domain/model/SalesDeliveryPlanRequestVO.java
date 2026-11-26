package egovframework.let.sales.shipment.deliveryplan.domain.model;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private List<SalesDeliveryPlanDetailRequestVO> details;
    private Map<String, Object> decimalPolicy;
    private Map<String, Object> decimalColumns;
}
