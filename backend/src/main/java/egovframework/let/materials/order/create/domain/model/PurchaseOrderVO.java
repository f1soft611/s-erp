package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 헤더와 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주 헤더와 상세 행 조회 결과 모델")
@Getter
@Setter
public class PurchaseOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 ID", example = "100")
    private Long purchaseOrderId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "발주일", example = "2026-11-13")
    private LocalDate orderDt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "발주 담당자 이름", example = "홍길동")
    private String ordererName;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "발주 출처(CONFIRM 확정 기반, DIRECT 직접 발주)", example = "CONFIRM")
    private String sourceType;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "발주서 출력 여부(Y 출력함, N 출력 전)", example = "N")
    private String printAt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;

    @Schema(description = "상세 행 목록")
    private List<PurchaseOrderDetailVO> details;

    @Schema(description = "발주 잔량을 초과한 행 번호 목록(경고용)")
    private List<Integer> overOrderedLineNos;
}
