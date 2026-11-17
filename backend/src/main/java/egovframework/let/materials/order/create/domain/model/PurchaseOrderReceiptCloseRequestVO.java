package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고대기 마감 저장 요청을 전달하는 VO 클래스. 마감 값 외의 발주 값은 받지 않는다.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "입고대기 마감 저장 요청 모델")
@Getter
@Setter
public class PurchaseOrderReceiptCloseRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "상세 행 목록")
    private List<PurchaseOrderReceiptCloseDetailVO> details;
}
