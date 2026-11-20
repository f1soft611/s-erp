package egovframework.let.sales.shipment.delivery.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliverySourceOrderSearchVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String keyword;
    private String orderDtFrom;
    private String orderDtTo;
    private String orderNo;
    private String customerKeyword;
    private String materialKeyword;
    private String planNo;
    private String planDtFrom;
    private String planDtTo;
}
