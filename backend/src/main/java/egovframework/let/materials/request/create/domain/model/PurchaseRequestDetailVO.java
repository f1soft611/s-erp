package egovframework.let.materials.request.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 상세 응답을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 상세 응답 모델")
@Getter
@Setter
public class PurchaseRequestDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 상세 ID", example = "400")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청 ID", example = "300")
    private Long purchaseRequestId;

    @Schema(description = "행 순번", example = "1")
    private Integer lineNo;

    @Schema(description = "품목 ID", example = "101")
    private Long materialId;

    @Schema(description = "품목코드", example = "3001587")
    private String materialCode;

    @Schema(description = "품목명", example = "OPP 테이프(블랙)")
    private String materialName;

    @Schema(description = "규격")
    private String materialSpec;

    @Schema(description = "단위", example = "BOX")
    private String unit;

    @Schema(description = "요청수량", example = "10")
    private BigDecimal requestQty;

    @Schema(description = "요청납기일", example = "2026-11-20")
    private LocalDate requestDeliveryDt;

    @Schema(description = "사용용도 코드", example = "PRODUCTION")
    private String useType;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "비고(요청)")
    private String requestRemark;

    @Schema(description = "확정수량", example = "10")
    private BigDecimal confirmQty;
}
