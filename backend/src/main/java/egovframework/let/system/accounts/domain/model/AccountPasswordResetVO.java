package egovframework.let.system.accounts.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/** 비밀번호 초기화 결과. 임시 비밀번호는 이 응답에서만 한 번 볼 수 있다. */
@Schema(description = "비밀번호 초기화 결과")
@Getter
@Setter
public class AccountPasswordResetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long loginId;
    private String loginCode;
    private String temporaryPassword;
}
