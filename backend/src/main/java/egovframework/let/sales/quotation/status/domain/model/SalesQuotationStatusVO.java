package egovframework.let.sales.quotation.status.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationStatusVO {
    private Long quotationId;
    private String quotationNo;
    private LocalDate quotationDt;
    private LocalDate submitDt;
    private Long customerId;
    private String customerCode;
    private String customerName;
    private String customerReference;
    private String incoterms;
    private String paymentTerm;
    private String validTerm;
    private String currencyCode;
    private String remark;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String createdBy;
    private Long quotationDetailId;
    private Integer lineNo;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal quotationQty;
    private BigDecimal unitPrice;
    private BigDecimal lineAmt;
    private String detailRemark;
}
