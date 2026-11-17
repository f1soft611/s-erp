package egovframework.let.materials.arrival.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고현황 목록의 품목 행 조회 결과를 전달하는 VO 클래스. 헤더 값은 같은 가입고의 모든 행에 반복된다.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고현황 목록의 품목 행 조회 결과 모델")
@Getter
@Setter
public class MaterialArrivalStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "가입고일", example = "2026-11-16")
    private LocalDate arrivalDt;

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

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

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

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "비고")
    private String remark;
}
