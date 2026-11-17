package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 요청 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주 저장 요청 입력값 모델")
@Getter
@Setter
public class PurchaseOrderSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 출처(CONFIRM 확정 기반, DIRECT 직접 발주)", example = "CONFIRM")
    private String sourceType;

    @Schema(description = "발주일", example = "2026-11-13")
    private LocalDate orderDt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "발주구분 코드(공통코드 PURCHASE_ORDER_TYPE)", example = "RAW_MATERIAL")
    private String orderType;

    @Schema(description = "사용용도 코드(공통코드 PURCHASE_USE_TYPE)", example = "PRODUCTION")
    private String useType;

    @Schema(description = "상세 행 목록")
    private List<PurchaseOrderDetailSaveRequestVO> details;
}
