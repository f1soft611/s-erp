package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 검사 저장 전에 잠그고 검증하는 가입고 행의 상태(검사 대기량 계산용)를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "검사 저장 전에 잠그고 검증하는 가입고 행의 상태(검사 대기량 계산용) 모델")
@Getter
@Setter
public class MaterialInspectionArrivalRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "가입고 사용 여부(Y 정상, N 취소)", example = "Y")
    private String arrivalUseAt;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "품목 코드", example = "000012")
    private String materialCode;

    @Schema(description = "품목명", example = "샘플 품목 009")
    private String materialName;

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

    @Schema(description = "제외할 검사(수정 중인 검사)를 뺀 유효 검사의 (합격량+불합격량) 합", example = "10")
    private BigDecimal inspectedQty;
}
