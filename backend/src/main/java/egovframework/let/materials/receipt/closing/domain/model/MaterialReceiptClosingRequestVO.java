package egovframework.let.materials.receipt.closing.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 매입마감 요청 본문. 금액은 받지 않고 서버가 수량·단가·세금 구분으로 계산한다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "매입마감 요청 모델")
@Getter
@Setter
public class MaterialReceiptClosingRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "마감월(YYYYMM)", example = "202611")
    private String closingMonth;

    @Schema(description = "마감할 입고 행 목록(최대 500건)")
    private List<Row> rows;

    @Schema(description = "마감할 입고 행 입력값 모델")
    @Getter
    @Setter
    public static class Row implements Serializable {

        private static final long serialVersionUID = 1L;

        @Schema(description = "입고 상세 ID", example = "71")
        private Long receiptDetailId;

        @Schema(description = "마감 단가(입고 단가와 별도로 저장하며 마감 시 조정할 수 있다)", example = "1300")
        private BigDecimal unitPrice;

        @Schema(description = "마감 세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
        private String taxType;

        @Schema(description = "마감 부가세 포함 여부(Y 포함, N 별도. Y는 과세만 허용)", example = "N")
        private String vatIncludedAt;
    }
}
