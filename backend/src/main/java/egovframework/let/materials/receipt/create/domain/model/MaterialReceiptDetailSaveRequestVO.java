package egovframework.let.materials.receipt.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고 수정 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고 수정 요청의 상세 행 입력값 모델")
@Getter
@Setter
public class MaterialReceiptDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수정 요청에서 기존 입고 행을 가리킨다", example = "71")
    private Long materialReceiptDetailId;

    @Schema(description = "등록 요청에서 입고할 수입검사 행을 가리킨다", example = "31")
    private Long materialInspectionDetailId;

    @Schema(description = "입고수량", example = "10")
    private BigDecimal receiptQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "제조일", example = "2026-11-10")
    private LocalDate manufactureDt;

    @Schema(description = "소비기한", example = "2027-11-16")
    private LocalDate expireDt;

    @Schema(description = "비고")
    private String remark;
}
