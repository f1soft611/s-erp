package egovframework.let.materials.receipt.closing.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 매입마감 해제 요청 본문.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "매입마감 해제 요청 모델")
@Getter
@Setter
public class MaterialReceiptClosingReleaseRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "마감을 해제할 입고 상세 ID 목록(최대 500건)")
    private List<Long> receiptDetailIds;
}
