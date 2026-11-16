package egovframework.let.materials.request.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 헤더와 상세 응답을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 정보 응답 모델")
@Getter
@Setter
public class PurchaseRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 ID", example = "300")
    private Long purchaseRequestId;

    @Schema(description = "테넌트 ID", example = "1")
    private Long tenantId;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "요청일", example = "2026-11-12")
    private LocalDate requestDt;

    @Schema(description = "요청자 사용자 ID", example = "7")
    private Long requesterId;

    @Schema(description = "요청자 이름", example = "홍길동")
    private String requesterName;

    @Schema(description = "요청부서 ID", example = "3")
    private Long requestDeptId;

    @Schema(description = "요청부서 이름", example = "생산지원팀")
    private String requestDeptName;

    @Schema(description = "상태 코드 (REQUESTED/PARTIALLY_CONFIRMED/CONFIRMED)", example = "REQUESTED")
    private String status;

    @Schema(description = "상세 금액 합계", example = "0")
    private BigDecimal totalAmt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "등록자 로그인 코드", example = "user01")
    private String createdBy;

    @Schema(description = "등록자 이름", example = "홍길동")
    private String createdByName;

    @Schema(description = "등록일시", example = "2026-11-12 08:38")
    private String createdAt;

    @Schema(description = "수정자 로그인 코드", example = "user01")
    private String updatedBy;

    @Schema(description = "수정자 이름", example = "홍길동")
    private String updatedByName;

    @Schema(description = "수정일시", example = "2026-11-12 09:10")
    private String updatedAt;

    @Schema(description = "구매요청 상세 목록")
    private List<PurchaseRequestDetailVO> details;
}
