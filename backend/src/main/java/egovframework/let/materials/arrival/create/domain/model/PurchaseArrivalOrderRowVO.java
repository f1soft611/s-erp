package egovframework.let.materials.arrival.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고 저장 시 잠그고 검증하는 발주 품목 행의 상태(유효 여부, 마감, 기가입고 수량)를 담는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고 저장 시 잠그고 검증하는 발주 품목 행의 상태(유효 여부, 마감, 기가입고 수량)를 담는 모델")
@Getter
@Setter
public class PurchaseArrivalOrderRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주 ID", example = "100")
    private Long purchaseOrderId;

    @Schema(description = "발주 헤더의 사용 여부. N이면 취소된 발주", example = "Y")
    private String orderUseAt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "유효한 가입고 행 수량 합(이 가입고의 기존 행 포함)", example = "10")
    private BigDecimal arrivedQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "입고대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String receiptCloseAt;
}
