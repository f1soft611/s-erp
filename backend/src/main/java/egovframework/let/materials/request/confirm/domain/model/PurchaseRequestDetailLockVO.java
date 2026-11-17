package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 확정 전에 잠근 구매요청 상세 행의 소속 요청·확정 연결을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "확정 전에 잠근 구매요청 상세 행의 소속 요청·확정 연결 모델")
@Getter
@Setter
public class PurchaseRequestDetailLockVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청 ID", example = "300")
    private Long purchaseRequestId;

    @Schema(description = "구매요청확정 ID", example = "500")
    private Long purchaseConfirmId;
}
