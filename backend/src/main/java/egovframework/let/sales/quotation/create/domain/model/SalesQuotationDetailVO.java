package egovframework.let.sales.quotation.create.domain.model;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationDetailVO {
    private Long quotationDetailId;
    private Long quotationId;
    private Long tenantId;
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal quotationQty;
    private BigDecimal unitPrice;
    private BigDecimal lineAmt;
    private String remark;
}
