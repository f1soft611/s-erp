package egovframework.let.materials.receipt.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고 상세 행(가입고·발주 연결 정보 포함) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고 상세 행(가입고·발주 연결 정보 포함) 조회 결과 모델")
@Getter
@Setter
public class PurchaseReceiptDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고 상세 ID", example = "71")
    private Long purchaseReceiptDetailId;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "연결된 가입고 행. 무검사 입고가 취소돼 가입고 행이 삭제되면 null이다", example = "700")
    private Long purchaseArrivalDetailId;

    @Schema(description = "연결된 가입고 헤더 ID(링크용). 연결이 끊기면 null이다", example = "800")
    private Long purchaseArrivalId;

    @Schema(description = "연결된 가입고 헤더가 유효(Y)인지. 연결이 없으면 null이다", example = "Y")
    private String arrivalActive;

    @Schema(description = "연결된 가입고 행의 검사대상 여부(N이면 무검사). 연결이 없으면 null이다", example = "Y")
    private String inspectAt;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "입고한 수입검사 행. 무검사 입고 행이거나 검사 행이 삭제돼 연결이 끊기면 null이다", example = "31")
    private Long qualityInspectionDetailId;

    @Schema(description = "검사번호 복사본. 무검사 입고 행은 null이다", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

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

    @Schema(description = "이 행의 가입고 수량을 제외한 다른 유효 가입고 수량을 뺀 발주 잔량(수량 상한 참고값)", example = "8")
    private BigDecimal remainQty;

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

    @Schema(description = "검사 연결 행의 입고수량 상한 = 합격량 − 이 입고를 제외한 다른 유효 입고 합. 무검사 행은 null이다", example = "6")
    private BigDecimal receivableQty;

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

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

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

    @Schema(description = "매입마감월 YYYYMM(미마감이면 null). 마감된 행이 있는 입고는 수정·행 빼기·취소할 수 없다", example = "202611")
    private String closingMonth;
}
