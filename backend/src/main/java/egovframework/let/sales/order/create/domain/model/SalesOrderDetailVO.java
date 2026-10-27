package egovframework.let.sales.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 저장된 수주 상세 응답을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주 상세 정보 응답 모델")
@Getter
@Setter
public class SalesOrderDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 상세 ID", example = "450")
    private Long salesOrderDetailId;

    @Schema(description = "수주 ID", example = "300")
    private Long salesOrderId;

    @Schema(description = "테넌트 ID", example = "71")
    private Long tenantId;

    @Schema(description = "수주 상세 순번", example = "1")
    private Integer lineNo;

    @Schema(description = "품목 ID", example = "20")
    private Long materialId;

    @Schema(description = "주문수량", example = "2.00")
    private BigDecimal orderQty;

    @Schema(description = "단가", example = "100.00")
    private BigDecimal unitPrice;

    @Schema(description = "공급가액", example = "200.00")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세", example = "20.00")
    private BigDecimal vatAmt;

    @Schema(description = "상세 합계", example = "220.00")
    private BigDecimal totalAmt;

    @Schema(description = "상세 납기일자", example = "2026-11-10")
    private LocalDate deliveryDt;

    @Schema(description = "출하수량", example = "0.00")
    private BigDecimal shippedQty;

    @Schema(description = "상세 상태", example = "대기")
    private String lineStatus;
}
