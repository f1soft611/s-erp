package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정(확정번호 단위) 헤더와 묶인 상세 행을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청확정(확정번호 단위) 헤더와 묶인 상세 행 모델")
@Getter
@Setter
public class PurchaseConfirmVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청확정 ID", example = "500")
    private Long purchaseConfirmId;

    @Schema(description = "테넌트 ID", example = "1")
    private Long tenantId;

    @Schema(description = "구매요청확정번호", example = "MC-20261112-0001")
    private String confirmNo;

    @Schema(description = "확정일", example = "2026-11-12")
    private LocalDate confirmDt;

    @Schema(description = "확정자 이름", example = "홍길동")
    private String confirmerName;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;

    @Schema(description = "수정자 이름", example = "관리자")
    private String updatedByName;

    @Schema(description = "수정 일시", example = "2026-11-17T11:00:00")
    private String updatedAt;

    @Schema(description = "상세 행 목록")
    private List<PurchaseRequestConfirmDetailVO> details = new ArrayList<PurchaseRequestConfirmDetailVO>();
}
