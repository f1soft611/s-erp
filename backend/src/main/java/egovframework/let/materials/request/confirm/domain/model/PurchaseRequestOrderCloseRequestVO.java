package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 발주대기 마감 저장 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청 발주대기 마감 저장 요청 모델")
@Getter
@Setter
public class PurchaseRequestOrderCloseRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "상세 행 목록")
    private List<PurchaseRequestOrderCloseDetailVO> details;
}
