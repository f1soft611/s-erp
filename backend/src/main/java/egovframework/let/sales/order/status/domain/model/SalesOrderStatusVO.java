package egovframework.let.sales.order.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 수주 헤더와 상세를 한 행으로 결합한 수주현황 응답 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주현황 응답 모델")
@Getter
@Setter
public class SalesOrderStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 ID", example = "300")
    private Long salesOrderId;

    @Schema(description = "수주 상세 ID", example = "450")
    private Long salesOrderDetailId;

    @Schema(description = "수주번호", example = "SO-20261027-0001")
    private String orderNo;

    @Schema(description = "수주일자", example = "2026-10-27")
    private LocalDate orderDt;

    @Schema(description = "거래처 코드", example = "C-10")
    private String customerCode;

    @Schema(description = "거래처명", example = "거래처 10")
    private String customerName;

    @Schema(description = "견적번호", example = "Q-2026-001")
    private String quotNo;

    @Schema(description = "수주상태", example = "수주등록")
    private String status;

    @Schema(description = "헤더 납기일자", example = "2026-11-01")
    private LocalDate headerDeliveryDt;

    @Schema(description = "납품장소", example = "본사 창고")
    private String deliveryPlace;

    @Schema(description = "배송방법", example = "택배")
    private String deliveryMethod;

    @Schema(description = "수주 비고", example = "긴급")
    private String remark;

    @Schema(description = "수주 상세 순번", example = "1")
    private Integer lineNo;

    @Schema(description = "품목 코드", example = "M-20")
    private String materialCode;

    @Schema(description = "품목명", example = "볼트")
    private String materialName;

    @Schema(description = "단위", example = "EA")
    private String unit;

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

    @Schema(description = "납기일자 (상세 납기, 없으면 헤더 납기)", example = "2026-11-01")
    private LocalDate deliveryDt;

    @Schema(description = "출하수량", example = "0.00")
    private BigDecimal shippedQty;

    @Schema(description = "행상태", example = "대기")
    private String lineStatus;
}
