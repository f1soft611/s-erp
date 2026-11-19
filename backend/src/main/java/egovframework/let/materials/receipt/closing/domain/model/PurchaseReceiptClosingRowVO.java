package egovframework.let.materials.receipt.closing.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 매입마감 화면 오른쪽의 입고 행. 금액·세금 값은 마감 행이면 마감 값, 미마감 행이면 입고 값이다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "매입마감 대상 입고 행 조회 결과 모델")
@Getter
@Setter
public class PurchaseReceiptClosingRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고 ID", example = "900")
    private Long purchaseReceiptId;

    @Schema(description = "입고 상세 ID", example = "71")
    private Long purchaseReceiptDetailId;

    @Schema(description = "입고번호", example = "MI-20261117-0001")
    private String receiptNo;

    @Schema(description = "입고일", example = "2026-11-17")
    private LocalDate receiptDt;

    @Schema(description = "입고 헤더 사용 여부(Y 정상, N 취소). 마감·해제 검증에 쓴다", example = "Y")
    private String useAt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "규격", example = "M8")
    private String materialSpec;

    @Schema(description = "단위", example = "KG")
    private String unit;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "입고수량", example = "10")
    private BigDecimal receiptQty;

    @Schema(description = "단가(마감 행은 마감 단가, 미마감 행은 입고 단가)", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "세금 구분 코드(마감 행은 마감 값, 미마감 행은 입고 값. TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도. 마감 행은 마감 값)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "공급가액(마감 행은 마감 값, 미마감 행은 입고 값)", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액(마감 행은 마감 값, 미마감 행은 입고 값)", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액(마감 행은 마감 값, 미마감 행은 입고 값)", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "매입마감월(YYYYMM). 미마감이면 null", example = "202611")
    private String closingMonth;

    @Schema(description = "매입마감 일시", example = "2026-11-17T17:00:00")
    private LocalDateTime closedAt;

    @Schema(description = "매입마감자(로그인 ID)", example = "admin")
    private String closedBy;

    @Schema(description = "매입마감 여부", example = "true")
    private Boolean closed;
}
