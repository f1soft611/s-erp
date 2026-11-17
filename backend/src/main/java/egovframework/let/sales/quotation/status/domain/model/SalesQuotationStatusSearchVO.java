package egovframework.let.sales.quotation.status.domain.model;

import lombok.Getter;
import lombok.Setter;
import io.swagger.v3.oas.annotations.media.Schema;

@Getter @Setter
public class SalesQuotationStatusSearchVO {
    @Schema(description = "통합검색어 (견적번호/거래처/품목 코드·명 부분일치)")
    private String keyword;
    private String quotationDtFrom;
    private String quotationDtTo;
    private String submitDtFrom;
    private String submitDtTo;
    private String quotationNo;
    private String customerKeyword;
    private String materialKeyword;
}
