package egovframework.let.materials.request.status.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청현황 검색 조건 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청현황 검색 조건")
@Getter
@Setter
public class PurchaseRequestStatusSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "빠른 검색어 (구매요청번호/품목/요청자 부분일치)", example = "MR-2026")
    private String keyword;

    @Schema(description = "구매요청번호 부분일치")
    private String requestNo;

    @Schema(description = "요청일 시작 (yyyy-MM-dd)", example = "2026-11-01")
    private String requestDtFrom;

    @Schema(description = "요청일 종료 (yyyy-MM-dd)", example = "2026-11-30")
    private String requestDtTo;

    @Schema(description = "요청자명 부분일치")
    private String requesterKeyword;

    @Schema(description = "상태 코드 (REQUESTED/PARTIALLY_CONFIRMED/CONFIRMED)")
    private String status;

    @Schema(description = "품목코드·품목명 부분일치")
    private String materialKeyword;

    @Schema(description = "요청납기일 시작 (yyyy-MM-dd)")
    private String requestDeliveryDtFrom;

    @Schema(description = "요청납기일 종료 (yyyy-MM-dd)")
    private String requestDeliveryDtTo;

    @Schema(description = "사용용도 코드")
    private String useType;
}
