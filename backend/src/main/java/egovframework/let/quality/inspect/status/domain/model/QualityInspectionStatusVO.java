package egovframework.let.quality.inspect.status.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재수입검사현황 목록의 품목 행(검사 헤더 정보 포함)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재수입검사현황 목록의 품목 행(검사 헤더 정보 포함) 모델")
@Getter
@Setter
public class QualityInspectionStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 ID", example = "600")
    private Long qualityInspectionId;

    @Schema(description = "수입검사 상세 ID", example = "31")
    private Long qualityInspectionDetailId;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "검사일", example = "2026-11-17")
    private LocalDate inspectionDt;

    @Schema(description = "검사자 이름", example = "홍길동")
    private String inspectorName;

    @Schema(description = "ACTIVE 정상, CANCELED 취소", example = "ACTIVE")
    private String status;

    @Schema(description = "헤더 비고")
    private String headerRemark;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "연결된 가입고 헤더 ID(링크용). 가입고 행이 삭제돼 연결이 끊기면 null", example = "800")
    private Long purchaseArrivalId;

    @Schema(description = "연결된 가입고 헤더가 유효하면 true(링크 활성화 기준)", example = "true")
    private Boolean arrivalLinked;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

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

    @Schema(description = "가입고수량", example = "10")
    private BigDecimal arrivalQty;

    @Schema(description = "검사량(합격량 + 불합격량)", example = "10")
    private BigDecimal inspectQty;

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "불합격량", example = "0")
    private BigDecimal failQty;

    @Schema(description = "합격량/검사량(%), 소수 첫째 자리", example = "100.0")
    private BigDecimal passRate;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "등록자 이름", example = "관리자")
    private String createdByName;
}
