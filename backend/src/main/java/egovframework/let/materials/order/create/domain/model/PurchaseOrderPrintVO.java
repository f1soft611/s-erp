package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 발주서 출력 데이터(회사·구매처·발주자 정보와 품목)를 전달하는 VO 클래스.
 * 회사·구매처·발주자 값은 발주 저장 시 복사한 스냅샷이며, 스냅샷이 없는 기존 발주는 현재 정보로 대체한다.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "발주서 출력 데이터(회사·구매처·발주자 정보와 품목) 모델")
@Getter
@Setter
public class PurchaseOrderPrintVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주 ID", example = "100")
    private Long purchaseOrderId;

    @Schema(description = "발주번호", example = "PO-20261113-0001")
    private String orderNo;

    @Schema(description = "발주일", example = "2026-11-13")
    private LocalDate orderDt;

    @Schema(description = "통화 코드", example = "KRW")
    private String currencyCode;

    @Schema(description = "세금 구분 코드(TAXABLE 과세, ZERO_RATED 영세, EXEMPT 면세)", example = "TAXABLE")
    private String taxType;

    @Schema(description = "부가세 포함 여부(Y 포함, N 별도)", example = "N")
    private String vatIncludedAt;

    @Schema(description = "공급가액", example = "10000")
    private BigDecimal supplyAmt;

    @Schema(description = "부가세액", example = "1000")
    private BigDecimal vatAmt;

    @Schema(description = "합계금액", example = "11000")
    private BigDecimal totalAmt;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "발주서 출력 여부(Y 출력함, N 출력 전)", example = "N")
    private String printAt;

    @Schema(description = "사용 여부(Y 사용, N 취소·삭제)", example = "Y")
    private String useAt;

    @Schema(description = "발주서 출력용 회사명", example = "(주)에스이알피")
    private String companyName;

    @Schema(description = "발주서 출력용 회사 사업자번호", example = "123-45-67890")
    private String companyBusinessNo;

    @Schema(description = "발주서 출력용 회사 대표자명", example = "홍길동")
    private String companyPresidentName;

    @Schema(description = "발주서 출력용 회사 우편번호", example = "04524")
    private String companyPostCode;

    @Schema(description = "발주서 출력용 회사 주소", example = "서울특별시 중구 세종대로 1")
    private String companyAddress;

    @Schema(description = "발주서 출력용 회사 전화번호", example = "02-1234-5678")
    private String companyTelephoneNo;

    @Schema(description = "발주서 출력용 회사 팩스번호", example = "02-1234-5679")
    private String companyFacsimileNo;

    @Schema(description = "발주서 출력용 회사 직인 이미지(이미지 주소 또는 데이터 URL)")
    private String companyStampImage;

    @Schema(description = "발주서 출력용 회사 로고 이미지(이미지 주소 또는 데이터 URL)")
    private String companyLogoImage;

    @Schema(description = "발주서 출력용 구매처명", example = "테스트")
    private String vendorName;

    @Schema(description = "발주서 출력용 구매처 사업자번호", example = "333-32-31231")
    private String vendorBusinessNo;

    @Schema(description = "발주서 출력용 구매처 대표자명")
    private String vendorPresidentName;

    @Schema(description = "발주서 출력용 구매처 우편번호")
    private String vendorPostCode;

    @Schema(description = "발주서 출력용 구매처 주소")
    private String vendorAddress;

    @Schema(description = "발주서 출력용 구매처 전화번호")
    private String vendorTelephoneNo;

    @Schema(description = "발주서 출력용 구매처 팩스번호")
    private String vendorFacsimileNo;

    @Schema(description = "발주서 출력용 구매처 담당자")
    private String vendorCharge;

    @Schema(description = "발주 담당자 이름", example = "홍길동")
    private String ordererName;

    @Schema(description = "발주 담당자 휴대전화번호", example = "010-1234-5678")
    private String ordererMobileNo;

    @Schema(description = "상세 행 목록")
    private List<PurchaseOrderPrintDetailVO> details;
}
