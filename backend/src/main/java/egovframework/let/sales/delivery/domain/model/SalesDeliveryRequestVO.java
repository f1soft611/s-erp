package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private LocalDate deliveryDt;
    private String deliveryType;
    private Long customerId;
    private Long salesOrderId;
    private String deliveryPlace;
    private String deliveryMethod;
    private String remark;
    private List<SalesDeliveryDetailRequestVO> details;
}
