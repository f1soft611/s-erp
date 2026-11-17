package egovframework.let.materials.arrival.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 가입고 대상(발주 품목 행, 잔량 포함) 조회 결과를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Schema(description = "가입고 대상(발주 품목 행, 잔량 포함) 조회 결과 모델")
@Getter
@Setter
public class MaterialArrivalCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "발주일", example = "2026-11-13")
    private LocalDate orderDt;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

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

    @Schema(description = "품목 계정 코드(공통코드 ITEM_TYPE, 구매 가능: RAW 원재료·SUB 부재료·SUPPLY 소모품)", example = "RAW")
    private String materialTypeCode;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;

    @Schema(description = "발주수량", example = "10")
    private BigDecimal orderQty;

    @Schema(description = "발주 행의 유효 가입고 수량 합", example = "10")
    private BigDecimal arrivedQty;

    @Schema(description = "발주 잔량", example = "8")
    private BigDecimal remainQty;

    @Schema(description = "납기일", example = "2026-11-20")
    private LocalDate deliveryDt;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "발주구분 이름", example = "원자재")
    private String orderTypeName;

    @Schema(description = "사용용도 이름", example = "생산")
    private String useTypeName;

    @Schema(description = "비고")
    private String remark;
}
