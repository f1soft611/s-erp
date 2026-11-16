package egovframework.let.materials.request.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 상세 저장 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 상세 저장 요청 모델")
@Getter
@Setter
public class PurchaseRequestDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "기존 상세 ID (신규 행은 null)", example = "400")
    private Long purchaseRequestDetailId;

    @Schema(description = "품목 ID", example = "101")
    private Long materialId;

    @Schema(description = "요청수량", example = "10")
    private BigDecimal requestQty;

    @Schema(description = "요청납기일", example = "2026-11-20")
    private LocalDate requestDeliveryDt;

    @Schema(description = "사용용도 코드 (PURCHASE_USE_TYPE)", example = "PRODUCTION")
    private String useType;

    @Schema(description = "비고(요청)")
    private String requestRemark;
}
