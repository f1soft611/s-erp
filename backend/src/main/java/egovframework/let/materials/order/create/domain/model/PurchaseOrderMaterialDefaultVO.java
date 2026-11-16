package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 직접 발주 품목의 계정과 검사대상 기본값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Getter
@Setter
public class PurchaseOrderMaterialDefaultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long materialId;
    private String materialTypeCode;
    private String inspectAt;
}
