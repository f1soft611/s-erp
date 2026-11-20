package egovframework.let.system.policies.domain.model;

import java.io.Serializable;

/** 로그인 실패 잠금 정책 값(정책 LOGIN_LOCK_ENABLED, LOGIN_LOCK_MAX_ATTEMPTS). */
public class LoginLockPolicyVO implements Serializable {

    private static final long serialVersionUID = 1L;

    public static final int DEFAULT_MAX_ATTEMPTS = 5;
    public static final int MIN_MAX_ATTEMPTS = 3;
    public static final int MAX_MAX_ATTEMPTS = 10;

    private final boolean enabled;
    private final int maxAttempts;

    public LoginLockPolicyVO(boolean enabled, int maxAttempts) {
        this.enabled = enabled;
        this.maxAttempts = maxAttempts;
    }

    /** 잠금을 쓰지 않는 기본 정책. */
    public static LoginLockPolicyVO disabled() {
        return new LoginLockPolicyVO(false, DEFAULT_MAX_ATTEMPTS);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }
}
