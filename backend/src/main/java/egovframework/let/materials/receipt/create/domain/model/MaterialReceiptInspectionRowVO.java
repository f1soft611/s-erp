package egovframework.let.materials.receipt.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고 저장 전에 잠그고 검증하는 수입검사 행의 상태(입고 가능량 계산용)를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고 저장 전에 잠그고 검증하는 수입검사 행의 상태(입고 가능량 계산용) 모델")
@Getter
@Setter
public class MaterialReceiptInspectionRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 상세 ID", example = "31")
    private Long materialInspectionDetailId;

    @Schema(description = "수입검사 ID", example = "600")
    private Long materialInspectionId;

    @Schema(description = "수입검사 사용 여부(Y 정상, N 취소)", example = "Y")
    private String inspectionUseAt;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "가입고 사용 여부(Y 정상, N 취소)", example = "Y")
    private String arrivalUseAt;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "excludeReceiptId의 입고를 뺀 유효 입고수량 합", example = "4")
    private BigDecimal receivedQty;
}
