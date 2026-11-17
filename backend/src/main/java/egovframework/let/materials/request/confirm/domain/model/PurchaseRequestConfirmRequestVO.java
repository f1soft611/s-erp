package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 품목 행 묶음 확정 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 품목 행 묶음 확정 요청 모델")
@Getter
@Setter
public class PurchaseRequestConfirmRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "확정일", example = "2026-11-12")
    private LocalDate confirmDt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "상세 행 목록")
    private List<PurchaseRequestConfirmDetailRequestVO> details;
}
