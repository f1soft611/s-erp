package egovframework.let.co.master.itempartnerprice.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "단가 검색 조건. tenant는 인증정보에서 결정")
public class ItemPartnerPriceSearchCondition {
    @Schema(description = "품목/거래처 코드·명 부분검색")
    private String keyword;
    @Schema(description = "매입 또는 매출")
    private String tradeType;
    @Schema(description = "해당 일자에 유효한 단가 조회(YYYY-MM-DD)")
    private String effectiveOn;
    @Schema(description = "사용여부 Y/N")
    private String useAt;
}
