package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재 수입검사 요청의 상세 행 입력값을 전달하는 VO 클래스.
 * 등록은 materialArrivalDetailId로, 수정은 materialInspectionDetailId로 대상 행을 가리킨다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재 수입검사 요청의 상세 행 입력값 모델")
@Getter
@Setter
public class MaterialInspectionDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 상세 ID", example = "31")
    private Long materialInspectionDetailId;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "불합격량", example = "0")
    private BigDecimal failQty;

    @Schema(description = "비고")
    private String remark;
}
