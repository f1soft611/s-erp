package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 목록 행을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseConfirmListItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseConfirmId;
    private String confirmNo;
    private LocalDate confirmDt;
    private String confirmerName;
    private String currencyCode;
    private BigDecimal totalAmt;
    private Integer requestCount;
    private String remark;
    private String useAt;
}
