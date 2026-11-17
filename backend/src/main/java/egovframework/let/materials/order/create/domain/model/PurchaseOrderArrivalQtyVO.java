package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 행별 유효한 가입고 수량 합을 전달하는 VO 클래스. 가입고가 있는 행의 삭제·수정·취소를 막는 데 쓴다.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "발주 행별 유효한 가입고 수량 합 모델")
@Getter
@Setter
public class PurchaseOrderArrivalQtyVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주 행의 유효 가입고 수량 합", example = "10")
    private BigDecimal arrivedQty;
}
