package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 목록 행을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청확정 목록 행 모델")
@Getter
@Setter
public class PurchaseConfirmListItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청확정 ID", example = "500")
    private Long purchaseConfirmId;

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

    @Schema(description = "확정에 포함된 구매요청 건수", example = "2")
    private Integer requestCount;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;
}
