package egovframework.let.system.policies.service;

import java.util.List;
import java.util.Map;

import egovframework.let.system.policies.domain.model.LoginLockPolicyVO;
import egovframework.let.system.policies.domain.model.SystemPolicyHistoryVO;
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.model.SystemPolicyUserVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;

/**
 * 현재 테넌트 시스템 정책 관리 서비스
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
public interface SystemPolicyService {

    List<SystemPolicyVO> listPolicies(Long tenantId) throws Exception;

    /** 모듈 코드(대문자) → 그리드 소수점 자릿수. GRID_DECIMAL_{MODULE_CODE} NUMBER 정책만 반영한다. */
    Map<String, Map<String, Object>> getGridDecimals(Long tenantId) throws Exception;

    /** 거래명세서 발행 방식(AUTO/MANUAL). 정책이 없거나 값이 올바르지 않으면 MANUAL. */
    String getStatementIssueMode(Long tenantId) throws Exception;

    /** 로그인 실패 잠금 정책. 정책 행이 없거나 값이 올바르지 않으면 미사용(기준 횟수 5)으로 본다. */
    LoginLockPolicyVO getLoginLockPolicy(Long tenantId) throws Exception;

    /** 내 정보 사진 변경 정책(SELF 본인 허용 / ADMIN_ONLY 관리자만). 정책이 없거나 값이 올바르지 않으면 SELF. */
    String getProfilePhotoEditMode(Long tenantId) throws Exception;

    SystemPolicyVO createPolicy(Long tenantId, Long actorId, SystemPolicySaveRequestVO request) throws Exception;

    SystemPolicyVO updatePolicy(Long tenantId, Long actorId, Long policyId, SystemPolicySaveRequestVO request) throws Exception;

    void deletePolicy(Long tenantId, Long actorId, Long policyId, Integer version) throws Exception;

    List<SystemPolicyHistoryVO> listHistory(Long tenantId, Long policyId) throws Exception;

    List<SystemPolicyUserVO> searchUsers(Long tenantId, String keyword) throws Exception;
}