package egovframework.let.sales.order.create.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 수주 등록 API 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주 등록 요청 모델")
@Getter
@Setter
public class SalesOrderCreateRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주일자", required = true, example = "2026-10-27")
    private LocalDate orderDt;

    @Schema(description = "거래처 ID", required = true, example = "10")
    private Long customerId;

    @Schema(description = "견적번호", example = "QT-20261027-0001")
    private String quotNo;

    @Schema(description = "납기일자", example = "2026-11-10")
    private LocalDate deliveryDt;

    @Schema(description = "납품장소")
    private String deliveryPlace;

    @Schema(description = "배송방법")
    private String deliveryMethod;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "수주 상세 품목 목록", required = true)
    private List<SalesOrderDetailCreateRequestVO> details;
}
