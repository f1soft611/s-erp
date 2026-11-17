package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 대상 품목 행(확정되지 않은 구매요청 상세)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청확정 대상 품목 행(확정되지 않은 구매요청 상세) 모델")
@Getter
@Setter
public class PurchaseRequestConfirmCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 ID", example = "300")
    private Long purchaseRequestId;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "요청일", example = "2026-11-12")
    private LocalDate requestDt;

    @Schema(description = "요청자 이름", example = "홍길동")
    private String requesterName;

    @Schema(description = "요청 상태 코드(REQUESTED/PARTIALLY_CONFIRMED/CONFIRMED)", example = "REQUESTED")
    private String requestStatus;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "규격", example = "M8")
    private String materialSpec;

    @Schema(description = "단위", example = "KG")
    private String unit;

    @Schema(description = "요청수량", example = "20")
    private BigDecimal requestQty;

    @Schema(description = "요청납기일", example = "2026-11-19")
    private LocalDate requestDeliveryDt;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "요청 비고")
    private String requestRemark;
}
