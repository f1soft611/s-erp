package egovframework.let.sales.deliveryplan.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryPlanStatusSearchVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String keyword;
    private String planDtFrom;
    private String planDtTo;
}
