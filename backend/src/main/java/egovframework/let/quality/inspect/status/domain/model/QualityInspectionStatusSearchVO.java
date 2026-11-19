package egovframework.let.quality.inspect.status.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 자재수입검사현황 검색 조건을 전달하는 VO 클래스. 날짜는 yyyy-MM-dd 문자열이다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "자재수입검사현황 검색 조건 모델")
@Getter
@Setter
public class QualityInspectionStatusSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "통합 검색어(검사번호·가입고번호·구매처·품목코드·품목명·검사자 부분일치)")
    private String keyword;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "구매처 검색어(이름 부분일치)", example = "테스트")
    private String supplierKeyword;

    @Schema(description = "품목 검색어(코드·명 부분일치)", example = "볼트")
    private String materialKeyword;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "검사자 검색어(이름 부분일치)", example = "홍길동")
    private String inspectorKeyword;

    @Schema(description = "상태 조건. ACTIVE 정상(기본), CANCELED 취소, ALL 전체(취소 포함). 값이 없으면 ACTIVE로 본다", example = "ACTIVE")
    private String status;

    @Schema(description = "검사일 시작(검색)", example = "2026-11-01")
    private String inspectionDtFrom;

    @Schema(description = "검사일 종료(검색)", example = "2026-11-30")
    private String inspectionDtTo;
}
