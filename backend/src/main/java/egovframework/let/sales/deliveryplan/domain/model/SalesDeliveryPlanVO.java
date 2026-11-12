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
    private String createdBy;
    private String createdByName;
    private String createdByProfileImage;
    private String createdAt;
    private List<SalesDeliveryPlanDetailVO> details;
}
