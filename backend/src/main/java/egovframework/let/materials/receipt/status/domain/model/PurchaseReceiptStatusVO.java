package egovframework.let.materials.receipt.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고현황 목록의 품목 행 조회 결과를 전달하는 VO 클래스. 헤더 값은 같은 입고의 모든 행에 반복된다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고현황 목록의 품목 행 조회 결과 모델")
@Getter
@Setter
public class PurchaseReceiptStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고 ID", example = "900")
    private Long purchaseReceiptId;

    @Schema(description = "입고 상세 ID", example = "71")
    private Long purchaseReceiptDetailId;

    @Schema(description = "입고번호", example = "MI-20261117-0001")
    private String receiptNo;

    @Schema(description = "입고일", example = "2026-11-17")
    private LocalDate receiptDt;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "담당자 이름", example = "홍길동")
    private String receiverName;

    @Schema(description = "상태(ACTIVE 정상, CANCELED 취소)", example = "ACTIVE")
    private String status;

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

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "매입마감월 YYYYMM(미마감이면 null)", example = "202611")
    private String closingMonth;

    @Schema(description = "연결된 가입고 헤더 ID(링크용). 가입고 행이 삭제돼 연결이 끊기면 null", example = "800")
    private Long purchaseArrivalId;

    @Schema(description = "연결된 가입고 헤더가 유효하면 true(링크 활성화 기준)", example = "true")
    private Boolean arrivalLinked;

    @Schema(description = "입고한 수입검사의 검사번호. 무검사 입고 행은 null이다", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "규격", example = "M8")
    private String materialSpec;

    @Schema(description = "단위", example = "KG")
    private String unit;

    @Schema(description = "입고수량", example = "10")
    private BigDecimal receiptQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "제조일", example = "2026-11-10")
    private LocalDate manufactureDt;

    @Schema(description = "소비기한", example = "2027-11-16")
    private LocalDate expireDt;

    @Schema(description = "LOT 번호", example = "LOT-20261116")
    private String lotNo;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "등록자 이름", example = "관리자")
    private String createdByName;
}
