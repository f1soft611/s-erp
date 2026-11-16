package egovframework.let.materials.request.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 헤더와 상세를 품목 행 단위로 펼친 현황 행 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청현황 행")
@Getter
@Setter
public class PurchaseRequestStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 ID")
    private Long purchaseRequestId;

    @Schema(description = "구매요청 상세 ID")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "요청일")
    private LocalDate requestDt;

    @Schema(description = "요청자 이름")
    private String requesterName;

    @Schema(description = "요청부서 이름")
    private String requestDeptName;

    @Schema(description = "상태 코드 (REQUESTED/PARTIALLY_CONFIRMED/CONFIRMED)")
    private String status;

    @Schema(description = "비고(헤더)")
    private String remark;

    @Schema(description = "행 순번")
    private Integer lineNo;

    @Schema(description = "품목코드")
    private String materialCode;

    @Schema(description = "품목명")
    private String materialName;

    @Schema(description = "규격")
    private String materialSpec;

    @Schema(description = "단위")
    private String unit;

    @Schema(description = "요청수량")
    private BigDecimal requestQty;

    @Schema(description = "요청납기일")
    private LocalDate requestDeliveryDt;

    @Schema(description = "사용용도 코드")
    private String useType;

    @Schema(description = "사용용도 이름")
    private String useTypeName;

    @Schema(description = "비고(요청)")
    private String requestRemark;

    @Schema(description = "확정수량")
    private BigDecimal confirmQty;
}
