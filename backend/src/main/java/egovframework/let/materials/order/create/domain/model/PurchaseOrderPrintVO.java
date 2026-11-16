package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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
@Getter
@Setter
public class PurchaseOrderPrintVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseOrderId;
    private String orderNo;
    private LocalDate orderDt;
    private String currencyCode;
    private String taxType;
    private String vatIncludedAt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String remark;
    private String printAt;
    private String useAt;

    private String companyName;
    private String companyBusinessNo;
    private String companyPresidentName;
    private String companyPostCode;
    private String companyAddress;
    private String companyTelephoneNo;
    private String companyFacsimileNo;
    private String companyStampImage;
    private String companyLogoImage;

    private String vendorName;
    private String vendorBusinessNo;
    private String vendorPresidentName;
    private String vendorPostCode;
    private String vendorAddress;
    private String vendorTelephoneNo;
    private String vendorFacsimileNo;
    private String vendorCharge;

    private String ordererName;
    private String ordererMobileNo;

    private List<PurchaseOrderPrintDetailVO> details;
}
