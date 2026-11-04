package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliverySourceOrderVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesOrderId;
    private Long salesOrderDetailId;
    private String orderNo;
    private LocalDate orderDt;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private String deliveryPlace;
    private String deliveryMethod;
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String unit;
    private BigDecimal orderQty;
    private BigDecimal shippedQty;
    private BigDecimal remainingQty;
    private BigDecimal unitPrice;
}
