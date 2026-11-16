package egovframework.let.sales.quotation.create.domain.model;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationDetailCreateRequestVO {
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal quotationQty;
    private BigDecimal unitPrice;
    private String remark;
}
