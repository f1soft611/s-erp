package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 상세 행의 발주대기 마감 값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 상세 행의 발주대기 마감 값 모델")
@Getter
@Setter
public class PurchaseRequestOrderCloseDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "발주대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String orderCloseAt;
}
