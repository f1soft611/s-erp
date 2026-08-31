package egovframework.let.system.roles.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.roles.domain.model.SystemRoleSaveRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleSearchConditionVO;
import egovframework.let.system.roles.domain.model.SystemRoleVO;
import egovframework.let.system.roles.domain.repository.SystemRoleDAO;
import egovframework.let.system.roles.service.SystemRoleService;

/**
 * 역할 관리를 위한 서비스 구현 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Service("systemRoleService")
public class SystemRoleServiceImpl extends EgovAbstractServiceImpl implements SystemRoleService {

    private static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";

    private final SystemRoleDAO systemRoleDAO;

    public SystemRoleServiceImpl(SystemRoleDAO systemRoleDAO) {
        this.systemRoleDAO = systemRoleDAO;
    }

    @Override
    public List<SystemRoleVO> listRoles(Long tenantId) throws Exception {
        SystemRoleSearchConditionVO condition = new SystemRoleSearchConditionVO();
        condition.setTenantId(tenantId);
        return systemRoleDAO.selectRoleList(condition);
    }

    @Override
    @Transactional
    public SystemRoleVO createRole(Long tenantId, SystemRoleSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getRoleCode())) {
            throw new IllegalArgumentException("역할 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getRoleNm())) {
            throw new IllegalArgumentException("역할명은 필수입니다.");
        }

        validateRoleCodeDuplication(tenantId, payload.getRoleCode(), null);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("roleCode", payload.getRoleCode().trim());
        params.put("roleNm", payload.getRoleNm().trim());
        params.put("roleDc", payload.getRoleDc());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");

        Long newId = systemRoleDAO.insertRole(params);
        return findByIdOrThrow(tenantId, newId);
    }

    @Override
    @Transactional
    public SystemRoleVO updateRole(Long tenantId, Long roleId, SystemRoleSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getRoleNm())) {
            throw new IllegalArgumentException("역할명은 필수입니다.");
        }

        SystemRoleVO existing = findByIdOrThrow(tenantId, roleId);
        String nextUseAt = "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y";
        if (PLATFORM_ADMIN.equals(existing.getRoleCode()) && "N".equals(nextUseAt)) {
            throw new IllegalArgumentException("PLATFORM_ADMIN 역할은 비활성화할 수 없습니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("roleId", roleId);
        params.put("tenantId", tenantId);
        params.put("roleNm", payload.getRoleNm().trim());
        params.put("roleDc", payload.getRoleDc());
        params.put("useAt", nextUseAt);
        systemRoleDAO.updateRole(params);

        return findByIdOrThrow(tenantId, roleId);
    }

    private SystemRoleVO findByIdOrThrow(Long tenantId, Long roleId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("roleId", roleId);
        params.put("tenantId", tenantId);
        SystemRoleVO role = systemRoleDAO.selectRoleById(params);
        if (role == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "역할을 찾을 수 없습니다.");
        }
        return role;
    }

    private void validateRoleCodeDuplication(Long tenantId, String roleCode, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("roleCode", roleCode);
        Long existingId = systemRoleDAO.selectRoleIdByCode(params);
        if (existingId != null && (excludeId == null || !excludeId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 역할 코드입니다.");
        }
    }
}
