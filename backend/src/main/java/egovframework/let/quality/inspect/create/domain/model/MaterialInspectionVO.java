package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재 수입검사 헤더와 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재 수입검사 헤더와 상세 행 조회 결과 모델")
@Getter
@Setter
public class MaterialInspectionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 ID", example = "600")
    private Long materialInspectionId;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "검사일", example = "2026-11-17")
    private LocalDate inspectionDt;

    @Schema(description = "검사자 사용자 ID", example = "7")
    private Long inspectorId;

    @Schema(description = "검사자 이름", example = "홍길동")
    private String inspectorName;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;

    @Schema(description = "ACTIVE 정상, CANCELED 취소", example = "ACTIVE")
    private String status;

    @Schema(description = "등록자(로그인 ID)", example = "admin")
    private String createdBy;

    @Schema(description = "등록 일시", example = "2026-11-17T10:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "수정자(로그인 ID)", example = "admin")
    private String updatedBy;

    @Schema(description = "수정 일시", example = "2026-11-17T11:00:00")
    private LocalDateTime updatedAt;

    @Schema(description = "상세 행 목록")
    private List<MaterialInspectionDetailVO> details;
}
