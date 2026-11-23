package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "거래처 기준 단가 거래처 목록 조회 조건. tenant는 인증정보에서 결정")
public class ItemPriceCustomerOverviewCondition {
    @Schema(description = "거래구분(매입 또는 매출). 필수", allowableValues = {"매입", "매출"})
    private String tradeType;

    @Schema(description = "거래처코드·거래처명·사업자번호 부분검색")
    private String keyword;
    @Schema(description = "품목 계정분류 코드(쉼표 구분). 등록 건수를 이 계정분류 품목으로 센다. 비우면 전체", example = "RAW,SUB,SUPPLY")
    private String itemTypes;

    @Schema(description = "단가 등록 여부 필터", allowableValues = {"ALL", "REGISTERED", "UNREGISTERED"},
            defaultValue = "ALL")
    private String registerFilter;
    @Schema(description = "적용 기준일(YYYY-MM-DD). 기본 서버 오늘")
    private String effectiveOn;
}
