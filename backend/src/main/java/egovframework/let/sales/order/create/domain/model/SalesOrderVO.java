package egovframework.let.sales.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 저장된 수주 헤더 응답을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주 정보 응답 모델")
@Getter
@Setter
public class SalesOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 ID", example = "300")
    private Long salesOrderId;

    @Schema(description = "테넌트 ID", example = "71")
    private Long tenantId;

    @Schema(description = "수주번호", example = "SO-20261027-0001")
    private String orderNo;

    @Schema(description = "수주일자", example = "2026-10-27")
    private LocalDate orderDt;

    @Schema(description = "거래처 ID", example = "10")
    private Long customerId;

    @Schema(description = "견적번호")
    private String quotNo;

    @Schema(description = "납기일자")
    private LocalDate deliveryDt;

    @Schema(description = "납품장소")
    private String deliveryPlace;

    @Schema(description = "배송방법")
    private String deliveryMethod;

    @Schema(description = "수주 상태", example = "수주등록")
    private String status;

    @Schema(description = "수주 총액", example = "220.00")
    private BigDecimal totalAmt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "저장된 수주 상세 목록")
    private List<SalesOrderDetailVO> details;
}
