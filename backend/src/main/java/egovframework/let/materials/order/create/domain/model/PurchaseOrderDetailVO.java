package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주 상세 행 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주 상세 행 조회 결과 모델")
@Getter
@Setter
public class PurchaseOrderDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "행 번호", example = "1")
    private Integer lineNo;

    @Schema(description = "구매요청 상세 ID", example = "301")
    private Long purchaseRequestDetailId;

    @Schema(description = "구매요청번호", example = "MR-20261112-0001")
    private String requestNo;

    @Schema(description = "구매요청확정번호", example = "MC-20261112-0001")
    private String confirmNo;

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

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "납기일", example = "2026-11-20")
    private LocalDate deliveryDt;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "발주구분 코드(공통코드 PURCHASE_ORDER_TYPE)", example = "RAW_MATERIAL")
    private String orderType;

    @Schema(description = "발주구분 이름", example = "원자재")
    private String orderTypeName;

    @Schema(description = "사용용도 코드(공통코드 PURCHASE_USE_TYPE)", example = "PRODUCTION")
    private String useType;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "입고대기 마감 여부(Y 마감, N 미마감)", example = "N")
    private String receiptCloseAt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "확정 기준값(화면의 \"확정 대비\" 표시용). remainQty는 이 행을 뺀 다른 유효 발주 수량을 제외한 잔량이다", example = "10")
    private BigDecimal confirmQty;

    @Schema(description = "발주 잔량", example = "8")
    private BigDecimal remainQty;

    @Schema(description = "확정 구매처 ID", example = "4")
    private Long confirmSupplierId;

    @Schema(description = "확정단가", example = "1250")
    private BigDecimal confirmUnitPrice;

    @Schema(description = "확정납기일", example = "2026-11-20")
    private LocalDate confirmDeliveryDt;

    @Schema(description = "확정 입고창고 ID", example = "1")
    private Long confirmWarehouseId;
}
