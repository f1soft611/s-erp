package egovframework.let.materials.order.create.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 직접 발주 품목의 계정과 검사대상 기본값을 전달하는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Schema(description = "직접 발주 품목의 계정과 검사대상 기본값 모델")
@Getter
@Setter
public class PurchaseOrderMaterialDefaultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "품목 ID", example = "12")
    private Long materialId;

    @Schema(description = "품목 계정 코드(공통코드 ITEM_TYPE, 구매 가능: RAW 원재료·SUB 부재료·SUPPLY 소모품)", example = "RAW")
    private String materialTypeCode;

    @Schema(description = "가입고 시 수입검사 대상 여부(Y 검사, N 무검사)", example = "Y")
    private String inspectAt;
}
