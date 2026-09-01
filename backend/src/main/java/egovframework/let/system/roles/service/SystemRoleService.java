package egovframework.let.system.roles.service;

import java.util.List;

import egovframework.let.system.roles.domain.model.SystemRoleSaveRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;

/**
 * 역할 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemRoleService {

    /**
     * 테넌트 기준 역할 목록을 조회한다.
     *
     * @param tenantId
     * @exception Exception
     */
    List<SystemRoleVO> listRoles(Long tenantId) throws Exception;

    /**
     * 역할을 등록한다.
     *
     * @param tenantId
     * @param payload
     * @exception Exception
     */
    SystemRoleVO createRole(Long tenantId, SystemRoleSaveRequestVO payload) throws Exception;

    /**
     * 역할을 수정한다. PLATFORM_ADMIN 역할은 비활성화할 수 없다.
     *
     * @param tenantId
     * @param roleId
     * @param payload
     * @exception Exception
     */
    SystemRoleVO updateRole(Long tenantId, Long roleId, SystemRoleSaveRequestVO payload) throws Exception;
}
