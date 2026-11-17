package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 저장 시 잠그는 확정 품목 행 상태를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주 저장 시 잠그는 확정 품목 행 상태 모델")
@Getter
@Setter
public class PurchaseOrderConfirmRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청확정 ID", example = "500")
    private Long purchaseConfirmId;

    @Schema(description = "확정 사용 여부(Y 정상, N 취소)", example = "Y")
    private String confirmUseAt;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "품목 계정 코드(공통코드 ITEM_TYPE, 구매 가능: RAW 원재료·SUB 부재료·SUPPLY 소모품)", example = "RAW")
    private String materialTypeCode;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "확정수량", example = "10")
    private BigDecimal confirmQty;

    @Schema(description = "유효 발주 수량 합", example = "10")
    private BigDecimal orderedQty;

    @Schema(description = "발주대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String orderCloseAt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "발주구분 코드(공통코드 PURCHASE_ORDER_TYPE)", example = "RAW_MATERIAL")
    private String orderType;

    @Schema(description = "사용용도 코드(공통코드 PURCHASE_USE_TYPE)", example = "PRODUCTION")
    private String useType;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "확정납기일", example = "2026-11-20")
    private LocalDate confirmDeliveryDt;
}
