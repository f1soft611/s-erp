package egovframework.let.quality.inspect.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 검사 대기 가입고 행(불러오기 창 목록) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "검사 대기 가입고 행(불러오기 창 목록) 조회 결과 모델")
@Getter
@Setter
public class MaterialInspectionCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long materialArrivalDetailId;

    @Schema(description = "가입고 ID", example = "800")
    private Long materialArrivalId;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "가입고일", example = "2026-11-16")
    private LocalDate arrivalDt;

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

    @Schema(description = "유효 검사의 검사량(합격량 + 불합격량) 합", example = "10")
    private BigDecimal inspectedQty;

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "불합격량", example = "0")
    private BigDecimal failQty;

    @Schema(description = "검사 대기량(가입고량 − 유효 검사량 합)", example = "10")
    private BigDecimal waitQty;
}
