package egovframework.let.materials.arrival.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고 상세 행(발주 대비 수량 포함) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고 상세 행(발주 대비 수량 포함) 조회 결과 모델")
@Getter
@Setter
public class MaterialArrivalDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

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

    @Schema(description = "이 행을 제외한 다른 유효 가입고 수량을 뺀 발주 잔량(수정 화면의 수량 상한)", example = "8")
    private BigDecimal remainQty;

    @Schema(description = "발주단가", example = "1250")
    private BigDecimal orderUnitPrice;

    @Schema(description = "발주 입고창고 ID", example = "1")
    private Long orderWarehouseId;

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

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "이 행과 연결된 유효한 입고(없으면 null). 있으면 가입고에서 수정·삭제할 수 없다", example = "900")
    private Long receiptId;

    @Schema(description = "입고번호", example = "MI-20261117-0001")
    private String receiptNo;

    @Schema(description = "이 행에 유효한 수입검사가 있으면 가장 최근 검사의 ID·번호. 없으면 null. 있으면 행이 잠긴다", example = "600")
    private Long inspectionId;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;
}
