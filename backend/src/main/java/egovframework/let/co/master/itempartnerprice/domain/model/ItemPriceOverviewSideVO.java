package egovframework.let.co.master.itempartnerprice.domain.model;

import java.math.BigDecimal;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목 기준 단가 조회의 매입 또는 매출 한쪽 단가")
public class ItemPriceOverviewSideVO {
    @Schema(description = "단가 내부 ID")
    private Long priceId;
    @Schema(description = "원화단가")
    private BigDecimal unitPrice;
    @Schema(description = "부가세구분 공통코드")
    private String taxType;
    @Schema(description = "부가세 포함 여부 Y/N")
    private String vatIncludedAt;
    @Schema(description = "외화단가")
    private BigDecimal foreignUnitPrice;
    @Schema(description = "외화단가의 통화")
    private String currency;
    @Schema(description = "최소주문수량. 정정 저장 때 유지하기 위해 내려준다")
    private BigDecimal moq;
    @Schema(description = "적용 시작일")
    private String startDt;
    @Schema(description = "적용 종료일")
    private String endDt;
    @Schema(description = "적용 상태", allowableValues = {"current", "future"})
    private String priceStatus;
}
