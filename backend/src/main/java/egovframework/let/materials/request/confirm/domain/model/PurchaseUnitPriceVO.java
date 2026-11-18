package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 단가관리의 기본 매입 단가를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "단가관리의 기본 매입 단가 모델")
@Getter
@Setter
public class PurchaseUnitPriceVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "통화 코드. 원화단가가 있으면 KRW, 외화단가만 있으면 그 외화통화", example = "KRW")
    private String currency;

    @Schema(description = "부가세구분 공통코드(PURCHASE_TAX_TYPE)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부 Y/N", example = "N")
    private String vatIncludedAt;

    @Schema(description = "외화단가(있는 경우). 통화를 foreignCurrency로 바꿀 때 단가로 쓴다", example = "9.50")
    private BigDecimal foreignUnitPrice;

    @Schema(description = "외화단가의 통화", example = "USD")
    private String foreignCurrency;
}
