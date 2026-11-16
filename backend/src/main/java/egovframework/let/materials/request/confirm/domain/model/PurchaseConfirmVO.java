package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정(확정번호 단위) 헤더와 묶인 상세 행을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseConfirmVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseConfirmId;
    private Long tenantId;
    private String confirmNo;
    private LocalDate confirmDt;
    private String confirmerName;
    private String currencyCode;
    private BigDecimal totalAmt;
    private String remark;
    private String useAt;
    private String updatedByName;
    private String updatedAt;
    private List<PurchaseRequestConfirmDetailVO> details = new ArrayList<PurchaseRequestConfirmDetailVO>();
}
