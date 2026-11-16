package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

/**
 * 단가관리의 기본 매입 단가를 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseUnitPriceVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private BigDecimal unitPrice;
    private String currency;
}
