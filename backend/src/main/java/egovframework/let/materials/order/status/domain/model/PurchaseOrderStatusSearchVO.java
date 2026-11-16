package egovframework.let.materials.order.status.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 발주현황 검색 조건 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderStatusSearchVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 빠른 검색어(발주번호·구매처·품목코드·품목명·발주자 부분일치) */
    private String keyword;
    private String orderNo;
    private String orderDtFrom;
    private String orderDtTo;
    private String supplierKeyword;
    /** ACTIVE / CANCELED, 없으면 전체 */
    private String status;
    private String materialKeyword;
    private String deliveryDtFrom;
    private String deliveryDtTo;
    /** CONFIRM / DIRECT */
    private String sourceType;
}
