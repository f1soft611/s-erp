package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 화면의 상세 행(구매요청·요청 상세·확정 정보)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "구매요청확정 화면의 상세 행(구매요청·요청 상세·확정 정보) 모델")
@Getter
@Setter
public class PurchaseRequestConfirmDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 ID", example = "300")
    private Long purchaseRequestId;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "요청일", example = "2026-11-12")
    private LocalDate requestDt;

    @Schema(description = "요청자 이름", example = "홍길동")
    private String requesterName;

    @Schema(description = "요청부서 이름", example = "생산지원팀")
    private String requestDeptName;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

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

    @Schema(description = "요청수량", example = "20")
    private BigDecimal requestQty;

    @Schema(description = "요청납기일", example = "2026-11-19")
    private LocalDate requestDeliveryDt;

    @Schema(description = "사용용도 코드(공통코드 PURCHASE_USE_TYPE)", example = "PRODUCTION")
    private String useType;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "요청 비고")
    private String requestRemark;

    @Schema(description = "확정수량", example = "10")
    private BigDecimal confirmQty;

    @Schema(description = "확정납기일", example = "2026-11-20")
    private LocalDate confirmDeliveryDt;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "발주구분 코드(공통코드 PURCHASE_ORDER_TYPE)", example = "RAW_MATERIAL")
    private String orderType;

    @Schema(description = "발주구분 이름", example = "원자재")
    private String orderTypeName;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "확정 시 설정한 부가세구분(없으면 과세로 취급)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "확정 시 설정한 부가세 포함 여부(없으면 미포함으로 취급)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "확정 금액(확정수량 × 확정단가)", example = "100000")
    private BigDecimal amount;

    @Schema(description = "확정 비고")
    private String confirmRemark;

    @Schema(description = "발주대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String orderCloseAt;
}
