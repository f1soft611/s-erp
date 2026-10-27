package egovframework.let.sales.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 수주 등록 API의 상세 품목 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주 상세 등록 요청 모델")
@Getter
@Setter
public class SalesOrderDetailCreateRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "품목 ID", required = true, example = "20")
    private Long materialId;

    @Schema(description = "주문수량. 0보다 큰 값", required = true, example = "2.00")
    private BigDecimal orderQty;

    @Schema(description = "단가. 0 이상, 소수 둘째 자리까지", required = true, example = "100.00")
    private BigDecimal unitPrice;

    @Schema(description = "부가세. 생략 시 공급가액의 10%로 계산", example = "20.00")
    private BigDecimal vatAmt;

    @Schema(description = "상세 납기일자", example = "2026-11-10")
    private LocalDate deliveryDt;
}
