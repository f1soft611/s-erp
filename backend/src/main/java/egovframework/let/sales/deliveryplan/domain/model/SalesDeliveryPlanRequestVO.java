package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private List<SalesDeliveryPlanDetailRequestVO> details;
}
