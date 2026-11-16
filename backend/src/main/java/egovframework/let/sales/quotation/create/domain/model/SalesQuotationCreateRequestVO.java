package egovframework.let.sales.quotation.create.domain.model;

import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationCreateRequestVO {
    private LocalDate quotationDt;
    private LocalDate submitDt;
    private Long customerId;
    private String customerReference;
    private String incoterms;
    private String paymentTerm;
    private String validTerm;
    private String currencyCode;
    private String remark;
    private List<SalesQuotationDetailCreateRequestVO> details;
}
