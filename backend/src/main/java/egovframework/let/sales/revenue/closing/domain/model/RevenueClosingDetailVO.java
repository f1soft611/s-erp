package egovframework.let.sales.revenue.closing.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RevenueClosingDetailVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long rowId;
    private Long salesDeliveryId;
    private String deliveryNo;
    private String deliveryDt;
    private String orderNo;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private String materialCode;
    private String materialName;
    private String closingStatus;
    private BigDecimal quantity;
    private BigDecimal salesAmount;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
}
