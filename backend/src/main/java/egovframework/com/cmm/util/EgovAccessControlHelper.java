package egovframework.com.cmm.util;

import egovframework.com.cmm.LoginVO;

/**
 * 역할코드 기준 테넌트 관리자 여부를 판별하는 접근제어 헬퍼 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public class EgovAccessControlHelper {

    private static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";
    private static final String TENANT_ADMIN = "TENANT_ADMIN";

    private EgovAccessControlHelper() {
    }

    /**
     * 로그인 사용자가 테넌트(또는 플랫폼) 관리자 역할인지 확인한다.
     */
    public static boolean isTenantAdmin(LoginVO user) {
        if (user == null || user.getRoleCode() == null) {
            return false;
        }
        return PLATFORM_ADMIN.equals(user.getRoleCode()) || TENANT_ADMIN.equals(user.getRoleCode());
    }
}
