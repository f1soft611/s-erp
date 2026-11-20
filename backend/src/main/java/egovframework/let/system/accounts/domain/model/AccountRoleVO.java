package egovframework.let.system.accounts.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 계정에 부여된 역할. */
@Schema(description = "계정 역할")
@Getter
@Setter
public class AccountRoleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(hidden = true)
    private Long loginId;
    private Long roleId;
    private String roleCode;
    private String roleNm;
}
