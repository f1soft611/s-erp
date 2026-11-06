package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliverySourceOrderHeaderVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesOrderId;
    private Long customerId;
    private String status;
    private String deliveryPlace;
    private String deliveryMethod;
}
