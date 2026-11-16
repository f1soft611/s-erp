package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매요청 품목 행 묶음 확정 요청을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseRequestConfirmRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private LocalDate confirmDt;
    private String remark;
    private List<PurchaseRequestConfirmDetailRequestVO> details;
}
