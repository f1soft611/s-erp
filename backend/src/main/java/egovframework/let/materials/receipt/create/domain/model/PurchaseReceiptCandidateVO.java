package egovframework.let.materials.receipt.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 입고 대상 수입검사 합격분(불러오기 창 목록) 조회 결과를 전달하는 VO 클래스.
 * receivableQty는 합격량에서 유효 입고 합을 뺀 입고 가능량이다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Schema(description = "입고 대상 수입검사 합격분(불러오기 창 목록) 조회 결과 모델")
@Getter
@Setter
public class PurchaseReceiptCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수입검사 상세 ID", example = "31")
    private Long qualityInspectionDetailId;

    @Schema(description = "수입검사 ID", example = "600")
    private Long qualityInspectionId;

    @Schema(description = "검사번호", example = "QI-20261117-0001")
    private String inspectionNo;

    @Schema(description = "검사일", example = "2026-11-17")
    private LocalDate inspectionDt;

    @Schema(description = "가입고 상세 ID", example = "700")
    private Long purchaseArrivalDetailId;

    @Schema(description = "가입고번호", example = "MP-20261116-0001")
    private String arrivalNo;

    @Schema(description = "구매처 ID", example = "4")
    private Long supplierId;

    @Schema(description = "구매처 코드", example = "213231")
    private String supplierCode;

    @Schema(description = "구매처명", example = "테스트")
    private String supplierName;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "발주 상세 ID", example = "120")
    private Long purchaseOrderDetailId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

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

    @Schema(description = "합격량", example = "10")
    private BigDecimal passQty;

    @Schema(description = "유효 입고수량 합", example = "4")
    private BigDecimal receivedQty;

    @Schema(description = "입고 가능량(합격량 − 유효 입고수량 합)", example = "6")
    private BigDecimal receivableQty;

    @Schema(description = "단가", example = "1250")
    private BigDecimal unitPrice;

    @Schema(description = "입고창고 ID", example = "1")
    private Long warehouseId;

    @Schema(description = "입고창고명", example = "자재창고")
    private String warehouseName;

    @Schema(description = "제조일", example = "2026-11-10")
    private LocalDate manufactureDt;

    @Schema(description = "소비기한", example = "2027-11-16")
    private LocalDate expireDt;
}
