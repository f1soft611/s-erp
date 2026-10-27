package egovframework.let.sales.order.status.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 수주현황 목록 검색 조건을 전달하는 VO 클래스.
 * 테넌트는 인증 사용자 기준으로만 적용하며 요청 값으로 받지 않는다.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@Schema(description = "수주현황 검색 조건 모델")
@Getter
@Setter
public class SalesOrderStatusSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "빠른 검색어 (수주번호/거래처/품목/견적번호 부분일치)", example = "SO-2026")
    private String keyword;

    @Schema(description = "수주번호 (부분일치)", example = "SO-20261027")
    private String orderNo;

    @Schema(description = "수주일자 시작 (yyyy-MM-dd)", example = "2026-10-01")
    private String orderDtFrom;

    @Schema(description = "수주일자 종료 (yyyy-MM-dd)", example = "2026-10-31")
    private String orderDtTo;

    @Schema(description = "거래처 코드/명 (부분일치)", example = "C-10")
    private String customerKeyword;

    @Schema(description = "견적번호 (부분일치)", example = "Q-2026-001")
    private String quotNo;

    @Schema(description = "수주상태", example = "수주등록")
    private String status;

    @Schema(description = "납기일자 시작 (yyyy-MM-dd, 상세 납기 우선)", example = "2026-11-01")
    private String deliveryDtFrom;

    @Schema(description = "납기일자 종료 (yyyy-MM-dd, 상세 납기 우선)", example = "2026-11-30")
    private String deliveryDtTo;

    @Schema(description = "품목 코드/명 (부분일치)", example = "M-20")
    private String materialKeyword;

    @Schema(description = "행상태", example = "대기")
    private String lineStatus;
}
