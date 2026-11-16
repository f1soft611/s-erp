package egovframework.let.sales.quotation.create.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationVO {
    private Long quotationId;
    private Long tenantId;
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
    private String createdByName;
    private String createdByProfileImage;
    private String createdAt;
    private Boolean writer;
    private List<SalesQuotationDetailVO> details;
}
