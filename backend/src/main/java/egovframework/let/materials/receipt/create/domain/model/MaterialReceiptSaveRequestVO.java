package egovframework.let.materials.receipt.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고 수정 요청 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고 수정 요청 입력값 모델")
@Getter
@Setter
public class MaterialReceiptSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고일", example = "2026-11-17")
    private LocalDate receiptDt;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "상세 행 목록")
    private List<MaterialReceiptDetailSaveRequestVO> details;
}
