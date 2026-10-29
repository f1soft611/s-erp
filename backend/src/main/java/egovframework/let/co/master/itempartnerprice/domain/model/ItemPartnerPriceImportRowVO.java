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
    @Schema(description = "통화 코드. 공백은 KRW")
    private String currency;
    @Schema(description = "적용 시작일(YYYY-MM-DD)")
    private String startDt;
    @Schema(description = "적용 종료일(YYYY-MM-DD)")
    private String endDt;
    @Schema(description = "최소주문수량 문자열. 공백 허용")
    private String moq;
    @Schema(description = "사용여부 Y/N. 공백은 Y")
    private String useAt;
}
