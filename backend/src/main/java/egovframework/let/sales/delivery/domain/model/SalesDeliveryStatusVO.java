package egovframework.let.sales.delivery.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDeliveryStatusVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long salesDeliveryId;
    private Long salesDeliveryDetailId;
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
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String unit;
    private Long salesOrderDetailId;
    private BigDecimal deliveryQty;
    private BigDecimal unitPrice;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
}
