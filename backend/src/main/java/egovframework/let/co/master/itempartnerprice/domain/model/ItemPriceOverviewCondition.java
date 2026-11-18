package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 기준 단가 조회 조건. tenant는 인증정보에서 결정")
public class ItemPriceOverviewCondition {
    @Schema(description = "품목코드·품목명·규격 부분검색")
    private String keyword;
    @Schema(description = "단가 상태 필터", allowableValues = {"ALL", "NO_PURCHASE", "NO_SALES", "HAS_SPECIAL"},
            defaultValue = "ALL")
    private String priceFilter;
    @Schema(description = "적용 기준일(YYYY-MM-DD). 기본 서버 오늘")
    private String effectiveOn;
}
