package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "엑셀 단가 행. master 코드는 text로 전송")
public class ItemPartnerPriceImportRowVO {
    @Schema(description = "원본 worksheet 행 번호", required = true)
    private Integer sourceRowNumber;
    @Schema(description = "매입 또는 매출")
    private String tradeType;
    @Schema(description = "tenant 품목코드")
    private String materialCode;
    @Schema(description = "tenant 거래처코드")
    private String customerCode;
    @Schema(description = "0 이상의 단가 문자열")
    private String unitPrice;
    @Schema(description = "부가세구분 공통코드(PURCHASE_TAX_TYPE). 공백은 TAXABLE")
    private String taxType;
    @Schema(description = "부가세 포함 여부 Y/N. 공백은 N")
    private String vatIncludedAt;
    @Schema(description = "외화단가 문자열. 공백 허용, 입력하면 통화 필수")
    private String foreignUnitPrice;
    @Schema(description = "외화단가의 통화 코드(공통코드 CURRENCY)")
    private String currency;
    @Schema(description = "적용 시작일(YYYY-MM-DD)")
    private String startDt;
    @Schema(description = "적용 종료일(YYYY-MM-DD)")
    private String endDt;
    @Schema(description = "최소주문수량 문자열. 공백 허용")
    private String moq;
    @Schema(description = "사용여부 Y/N. 공백은 Y")
    private String useAt;

    @Schema(description = "발주구분. 공통코드 PURCHASE_ORDER_TYPE의 코드 또는 이름. 공백 허용, 매입 행에서만")
    private String orderType;

    @Schema(description = "기본 거래처 여부 Y/N. 공백은 N, 거래처가 있는 매입 행에서만 Y")
    private String defaultSupplier;
}
