package egovframework.let.materials.receipt.closing.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 매입마감 화면 왼쪽의 구매처별 요약 행.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "구매처별 매입마감 요약 조회 결과 모델")
@Getter
@Setter
public class PurchaseReceiptClosingSupplierVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "사업자번호", example = "333-32-31231")
    private String businessNo;

    @Schema(description = "기간 내 정상 입고 행 수", example = "24")
    private Integer receiptCount;

    @Schema(description = "기간 내 정상 입고 행의 합계금액(마감 행은 마감 금액)", example = "199430")
    private BigDecimal receiptAmount;

    @Schema(description = "선택 마감월로 마감된 행 수(입고일 무관)", example = "3")
    private Integer monthClosedCount;

    @Schema(description = "선택 마감월로 마감된 합계금액(입고일 무관)", example = "38400")
    private BigDecimal monthClosedAmount;

    @Schema(description = "기간 내 미마감 행 수", example = "21")
    private Integer openCount;
}
