package egovframework.let.co.master.itempartnerprice.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "품목·거래처별 단가 저장 업무 필드")
public class ItemPartnerPriceSaveRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;
    @Schema(description = "품목 내부 ID", required = true)
    private Long materialId;
    @Schema(description = "거래처 내부 ID", required = true)
    private Long customerId;
    @Schema(description = "거래 구분", allowableValues = {"매입", "매출"}, required = true)
    private String tradeType;
    @Schema(description = "단가. 0 이상, NUMERIC(15,2)", required = true)
    private BigDecimal unitPrice;
    @Schema(description = "통화 코드. 공백이면 KRW", defaultValue = "KRW")
    private String currency;
    @Schema(description = "적용 시작일(YYYY-MM-DD)", required = true)
    private String startDt;
    @Schema(description = "적용 종료일(YYYY-MM-DD)")
    private String endDt;
    @Schema(description = "최소주문수량. 0 이상")
    private BigDecimal moq;
    @Schema(description = "사용여부", allowableValues = {"Y", "N"}, defaultValue = "Y")
    private String useAt;
}
