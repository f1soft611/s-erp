package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryId;
    private String deliveryNo;
    private LocalDate deliveryDt;
    private String deliveryType;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private Long salesOrderId;
    private String orderNo;
    private String deliveryPlace;
    private String deliveryMethod;
    private String remark;
    private BigDecimal totalAmt;
    private String createdBy;
    private Boolean writer;
    private List<SalesDeliveryDetailVO> details;
}
