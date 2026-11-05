package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryStatusSearchVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String deliveryDtFrom;
    private String deliveryDtTo;
    private String keyword;
    private String deliveryType;
    private String customerKeyword;
    private String materialKeyword;
    private String deliveryNo;
}
