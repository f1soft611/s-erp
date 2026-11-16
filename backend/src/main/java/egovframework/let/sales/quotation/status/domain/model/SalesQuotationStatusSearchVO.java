package egovframework.let.sales.quotation.status.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalesQuotationStatusSearchVO {
    private String quotationDtFrom;
    private String quotationDtTo;
    private String submitDtFrom;
    private String submitDtTo;
    private String quotationNo;
    private String customerKeyword;
    private String materialKeyword;
}
