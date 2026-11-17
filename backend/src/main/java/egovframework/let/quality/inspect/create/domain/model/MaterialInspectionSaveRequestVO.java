package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재 수입검사 등록·수정 요청 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재 수입검사 등록·수정 요청 입력값 모델")
@Getter
@Setter
public class MaterialInspectionSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "검사일", example = "2026-11-17")
    private LocalDate inspectionDt;

    @Schema(description = "검사자 사용자 ID. 없으면 로그인 사용자를 검사자로 본다", example = "7")
    private Long inspectorId;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "상세 행 목록")
    private List<MaterialInspectionDetailSaveRequestVO> details;
}
