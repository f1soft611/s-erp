package egovframework.let.materials.receipt.closing.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 매입마감 조회 조건을 전달하는 VO 클래스. 날짜는 {@code yyyy-MM-dd}, 마감월은 {@code YYYYMM} 문자열이다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "매입마감 조회 조건 모델")
@Getter
@Setter
public class PurchaseReceiptClosingSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고일 시작(조회 기간)", example = "2026-11-01")
    private String receiptFrom;

    @Schema(description = "입고일 종료(조회 기간)", example = "2026-11-30")
    private String receiptTo;

    @Schema(description = "마감월(YYYYMM). 조회구분 CLOSED의 기준 월이자 요약의 해당월 마감 집계 기준", example = "202611")
    private String closingMonth;

    @Schema(description = "품목 검색어(품목코드·품목명 부분일치)", example = "볼트")
    private String keyword;

    @Schema(description = "구매처 ID(입고 행 조회에서 구매처를 좁힐 때)", example = "4")
    private Long supplierId;

    @Schema(description = "ALL(기본), CLOSED(선택 마감월로 마감된 행), OPEN(미마감 행)", example = "ALL")
    private String closeType;

    @Schema(description = "발주번호(부분일치)", example = "PO-20261113-0001")
    private String orderNo;
}
