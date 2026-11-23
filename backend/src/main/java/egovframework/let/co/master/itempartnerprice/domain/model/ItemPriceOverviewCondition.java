package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 기준 단가 조회 조건. tenant는 인증정보에서 결정")
public class ItemPriceOverviewCondition {
    @Schema(description = "거래구분(매입 또는 매출). 필수", allowableValues = {"매입", "매출"})
    private String tradeType;

    @Schema(description = "품목코드·품목명·규격 부분검색")
    private String keyword;
    @Schema(description = "품목 계정분류 코드(쉼표 구분: PRODUCT, SEMI, GOODS, RAW, SUB, SUPPLY). 비우면 전체", example = "RAW,SUB,SUPPLY")
    private String itemTypes;

    @Schema(description = "단가 상태 필터. NO_PRICE=사용 중 단가 거래처가 없는 품목, "
            + "NO_DEFAULT_SUPPLIER=거래처 2곳 이상인데 기본 거래처가 없는 품목(매입만)",
            allowableValues = {"ALL", "NO_PRICE", "NO_DEFAULT_SUPPLIER"}, defaultValue = "ALL")
    private String priceFilter;
    @Schema(description = "적용 기준일(YYYY-MM-DD). 기본 서버 오늘")
    private String effectiveOn;
}
