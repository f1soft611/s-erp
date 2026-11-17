package egovframework.let.materials.request.create.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 로그인 사용자에 대응하는 요청자 사용자 ID와 부서 ID를 담는 VO 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Schema(description = "로그인 사용자에 대응하는 요청자 사용자 ID와 부서 ID를 담는 모델")
@Getter
@Setter
public class PurchaseRequestRequesterVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID", example = "7")
    private Long userId;

    @Schema(description = "부서 ID", example = "3")
    private Long departmentId;
}
