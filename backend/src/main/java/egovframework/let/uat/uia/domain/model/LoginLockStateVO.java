package egovframework.let.uat.uia.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/** 로그인 시도 계정의 실패 잠금 상태. */
@Getter
@Setter
public class LoginLockStateVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long loginId;
    /** 누적된 로그인 실패 횟수. */
    private int attemptCount;
    /** 잠금 시각이 있는지(locked_at). */
    private boolean locked;
}
