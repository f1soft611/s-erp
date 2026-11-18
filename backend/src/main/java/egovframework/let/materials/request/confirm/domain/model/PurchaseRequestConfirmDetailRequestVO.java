package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 확정 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 확정 요청의 상세 행 입력값 모델")
@Getter
@Setter
public class PurchaseRequestConfirmDetailRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "확정수량", example = "10")
    private BigDecimal confirmQty;

    @Schema(description = "확정납기일", example = "2026-11-20")
    private LocalDate confirmDeliveryDt;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "발주구분 코드(공통코드 PURCHASE_ORDER_TYPE)", example = "RAW_MATERIAL")
    private String orderType;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "부가세구분 공통코드(PURCHASE_TAX_TYPE). 비우면 TAXABLE", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부 Y/N. 비우면 N. 과세일 때만 Y 허용", example = "N")
    private String vatIncludedAt;

    @Schema(description = "확정 비고")
    private String confirmRemark;
}
