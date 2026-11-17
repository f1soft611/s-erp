package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재 수입검사 상세 행(가입고 행별 합격·불합격 수량) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재 수입검사 상세 행(가입고 행별 합격·불합격 수량) 조회 결과 모델")
@Getter
@Setter
public class MaterialInspectionDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 상세 ID", example = "31")
    private Long materialInspectionDetailId;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "연결된 가입고 행이 남아 있고 그 가입고가 정상이면 true", example = "true")
    private Boolean arrivalLinked;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

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

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

    @Schema(description = "이 검사를 제외한 유효 검사의 (합격량+불합격량) 합", example = "0")
    private BigDecimal otherInspectedQty;

    @Schema(description = "이 행에 입력할 수 있는 최대 검사량(가입고량 − 다른 검사 합)", example = "10")
    private BigDecimal maxQty;

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "불합격량", example = "0")
    private BigDecimal failQty;

    @Schema(description = "검사량(합격량 + 불합격량)", example = "10")
    private BigDecimal inspectQty;

    @Schema(description = "이 검사 행의 합격분을 입고한 유효 입고수량 합. 0보다 크면 취소·행 빼기·합격량 축소가 제한된다", example = "4")
    private BigDecimal receivedQty;

    @Schema(description = "가장 최근 유효 입고번호. 입고가 없으면 null이다", example = "MI-20261117-0001")
    private String receiptNo;

    @Schema(description = "비고")
    private String remark;
}
