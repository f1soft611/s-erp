package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 요청의 상세 행 입력값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주 저장 요청의 상세 행 입력값 모델")
@Getter
@Setter
public class PurchaseOrderDetailSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수정 요청에서 기존 발주 행을 가리킨다. 등록 요청에서는 쓰지 않는다", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "납기일", example = "2026-11-20")
    private LocalDate deliveryDt;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "비고")
    private String remark;
}
