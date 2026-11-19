package egovframework.let.materials.order.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주현황 목록(품목 행 단위) 조회 결과 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주현황 목록(품목 행 단위) 조회 결과 모델")
@Getter
@Setter
public class PurchaseOrderStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 ID", example = "100")
    private Long purchaseOrderId;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "발주일", example = "2026-11-13")
    private LocalDate orderDt;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "발주 담당자 이름", example = "홍길동")
    private String ordererName;

    @Schema(description = "상태(ACTIVE 정상, CANCELED 취소)", example = "ACTIVE")
    private String status;

    @Schema(description = "발주 출처(CONFIRM 확정 기반, DIRECT 직접 발주)", example = "CONFIRM")
    private String sourceType;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "세금 구분 이름", example = "과세")
    private String taxTypeName;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "헤더 공급가액", example = "10000")
    private BigDecimal headerSupplyAmt;

    @Schema(description = "헤더 부가세액", example = "1000")
    private BigDecimal headerVatAmt;

    @Schema(description = "헤더 합계금액", example = "11000")
    private BigDecimal headerTotalAmt;

    @Schema(description = "헤더 비고")
    private String headerRemark;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "구매요청확정번호", example = "MC-20261112-0001")
    private String confirmNo;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "규격", example = "M8")
    private String materialSpec;

    @Schema(description = "단위", example = "KG")
    private String unit;

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "가입고수량. 유효 가입고 합계에서 유효 수입검사 불합격 수량 합계를 뺀 값(가입고가 없으면 0)", example = "6")
    private BigDecimal arrivedQty;

    @Schema(description = "입고잔량. 발주수량에서 가입고수량을 뺀 값이며 0 미만이면 0", example = "4")
    private BigDecimal remainQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "납기일", example = "2026-11-20")
    private LocalDate deliveryDt;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "입고대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String receiptCloseAt;

    @Schema(description = "발주서 출력 여부(Y 출력함, N 출력 전)", example = "N")
    private String printAt;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "발주구분 이름", example = "원자재")
    private String orderTypeName;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "비고")
    private String remark;
}
