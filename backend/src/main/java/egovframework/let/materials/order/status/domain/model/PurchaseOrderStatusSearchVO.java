package egovframework.let.materials.order.status.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주현황 검색 조건 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주현황 검색 조건 모델")
@Getter
@Setter
public class PurchaseOrderStatusSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "통합 검색어(발주번호·구매처·품목코드·품목명·발주담당자 부분일치)")
    private String keyword;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "발주일 시작(검색)", example = "2026-11-01")
    private String orderDtFrom;

    @Schema(description = "발주일 종료(검색)", example = "2026-11-30")
    private String orderDtTo;

    @Schema(description = "구매처 검색어(이름 부분일치)", example = "테스트")
    private String supplierKeyword;

    @Schema(description = "상태 조건. ACTIVE 정상(기본), CANCELED 취소, ALL 전체(취소 포함). 값이 없으면 ACTIVE로 본다", example = "ACTIVE")
    private String status;

    @Schema(description = "품목 검색어(코드·명 부분일치)", example = "볼트")
    private String materialKeyword;

    @Schema(description = "납기일 시작(검색)", example = "2026-11-01")
    private String deliveryDtFrom;

    @Schema(description = "납기일 종료(검색)", example = "2026-11-30")
    private String deliveryDtTo;

    @Schema(description = "CONFIRM / DIRECT", example = "CONFIRM")
    private String sourceType;

    @Schema(description = "입고대기마감 조건. OPEN 미마감, CLOSED 마감. 값이 없으면 전체", example = "OPEN")
    private String receiptCloseType;
}
