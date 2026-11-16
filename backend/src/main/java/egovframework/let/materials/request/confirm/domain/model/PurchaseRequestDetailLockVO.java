package egovframework.let.materials.request.confirm.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 확정 전에 잠근 구매요청 상세 행의 소속 요청·확정 연결을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseRequestDetailLockVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long purchaseRequestDetailId;
    private Long purchaseRequestId;
    private Long purchaseConfirmId;
}
