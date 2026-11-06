package egovframework.let.system.policies.domain.model;
import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * USER_LIST 정책용 사용자 검색 결과 VO
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "정책 대상 사용자")
@Getter
@Setter
public class SystemPolicyUserVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID")
    private Long userId;

    @Schema(description = "사용자명")
    private String userName;
}