package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청확정 대상 품목 행(확정되지 않은 구매요청 상세)을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseRequestConfirmCandidateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestId;
    private Long purchaseRequestDetailId;
    private String requestNo;
    private LocalDate requestDt;
    private String requesterName;
    private String requestStatus;
    private Integer lineNo;
    private String materialCode;
    private String materialName;
    private String materialSpec;
    private String unit;
    private BigDecimal requestQty;
    private LocalDate requestDeliveryDt;
    private String useTypeName;
    private String requestRemark;
}
