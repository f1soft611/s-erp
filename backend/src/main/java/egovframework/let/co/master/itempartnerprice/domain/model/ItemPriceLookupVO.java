package egovframework.let.co.master.itempartnerprice.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 단가 조회 결과(거래처 지정 조회와 기본 거래처 기준 일괄 조회가 함께 쓴다)를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
@Schema(description = "단가 조회 결과")
@Getter
@Setter
public class ItemPriceLookupVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "품목 ID")
    private Long materialId;

    @Schema(description = "거래처 ID. 기본 거래처 기준 조회에서는 기본 거래처, 없으면 null")
    private Long supplierId;

    @Schema(description = "거래처코드")
    private String supplierCode;

    @Schema(description = "거래처명")
    private String supplierName;

    @Schema(description = "기본 설정 단가. 원화단가가 있으면 원화단가, 외화단가만 있으면 외화단가, 단가가 없으면 null")
    private BigDecimal unitPrice;

    @Schema(description = "기본 설정 통화. 원화단가가 있으면 KRW, 외화단가만 있으면 외화통화, 단가가 없으면 null")
    private String currency;

    @Schema(description = "부가세구분. 단가가 없으면 null")
    private String taxType;

    @Schema(description = "부가세 포함 여부 Y/N. 단가가 없으면 null")
    private String vatIncludedAt;

    @Schema(description = "외화단가")
    private BigDecimal foreignUnitPrice;

    @Schema(description = "외화단가의 통화")
    private String foreignCurrency;

    @Schema(description = "발주구분 코드")
    private String orderType;

    @Schema(description = "발주구분 이름")
    private String orderTypeName;
}
