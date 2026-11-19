package egovframework.let.materials.arrival.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고 저장 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고 저장 요청의 상세 행 입력값 모델")
@Getter
@Setter
public class PurchaseArrivalDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수정 요청에서 기존 가입고 행을 가리킨다. 등록 요청에서는 쓰지 않는다", example = "700")
    private Long purchaseArrivalDetailId;

    @Schema(description = "등록 요청에서 가입고할 발주 행을 가리킨다. 수정 요청에서는 저장된 값을 유지한다", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

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
