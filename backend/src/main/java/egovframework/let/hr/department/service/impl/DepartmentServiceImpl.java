package egovframework.let.hr.department.service.impl;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.department.domain.model.DepartmentSaveRequestVO;
import egovframework.let.hr.department.domain.model.DepartmentUserVO;
import egovframework.let.hr.department.domain.model.DepartmentVO;
import egovframework.let.hr.department.domain.repository.DepartmentDAO;
import egovframework.let.hr.department.service.DepartmentService;

@Service("departmentService")
public class DepartmentServiceImpl extends EgovAbstractServiceImpl implements DepartmentService {

    private static final int MAX_NAME_LENGTH = 100;
    private static final int MAX_DESCRIPTION_LENGTH = 500;
    static final String DUPLICATE_NAME_MESSAGE = "같은 상위 부서 아래에 동일한 부서명이 있습니다.";
    static final String IN_USE_MESSAGE = "하위 부서 또는 소속 사원이 있어 사용안함 처리할 수 없습니다.";
    static final String PARENT_INACTIVE_MESSAGE = "상위 부서가 사용안함이라 복원할 수 없습니다. 상위 부서를 먼저 복원해 주세요.";

    private final DepartmentDAO departmentDAO;

    public DepartmentServiceImpl(DepartmentDAO departmentDAO) {
        this.departmentDAO = departmentDAO;
    }

    @Override
    public List<DepartmentVO> listDepartments(Long tenantId, boolean includeInactive) throws Exception {
        validateTenantId(tenantId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("includeInactive", includeInactive);
        return departmentDAO.selectDepartmentList(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DepartmentVO createDepartment(
            Long tenantId, Long currentUserId, DepartmentSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        validatePayload(payload);
        String name = requireName(payload.getDepartmentNm());
        Long parentId = payload.getParentDepartmentId();
        if (parentId != null) {
            requireActiveParent(tenantId, parentId);
        }
        if (payload.getManagerUserId() != null) {
            // 부서장은 그 부서의 소속 사원이어야 하는데, 신규 부서에는 아직 소속 사원이 없다.
            throw new IllegalArgumentException("신규 부서에는 부서장을 지정할 수 없습니다. 등록 후 소속 사원을 배정한 뒤 지정해 주세요.");
        }
        requireUniqueName(tenantId, parentId, name, null);

        Map<String, Object> params = buildSaveParams(tenantId, currentUserId, name, payload);
        Long departmentId;
        try {
            departmentId = departmentDAO.insertDepartment(params);
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_NAME_MESSAGE, ex);
        }
        if (departmentId == null) {
            throw new IllegalStateException("부서 등록 결과를 확인할 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, departmentId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DepartmentVO updateDepartment(
            Long tenantId, Long currentUserId, Long departmentId, DepartmentSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        if (departmentId == null) {
            throw new IllegalArgumentException("부서 ID가 필요합니다.");
        }
        validatePayload(payload);
        DepartmentVO existing = findByIdOrThrow(tenantId, departmentId);
        String name = requireName(payload.getDepartmentNm());
        Long parentId = payload.getParentDepartmentId();
        if (parentId != null) {
            requireNoCircularParent(tenantId, departmentId, parentId);
            // 상위 부서를 바꾸지 않는 수정(이름 변경 등)은 상위 부서가 사용안함이어도 허용한다.
            if (!parentId.equals(existing.getParentDepartmentId())) {
                requireActiveParent(tenantId, parentId);
            }
        }
        // 부서장을 바꿀 때만 소속 여부를 검사한다(부서장이 다른 부서로 옮겨 간 뒤 이름만 고치는 수정은 막지 않는다).
        if (payload.getManagerUserId() != null && !payload.getManagerUserId().equals(existing.getManagerUserId())) {
            requireActiveMember(tenantId, departmentId, payload.getManagerUserId());
        }
        requireUniqueName(tenantId, parentId, name, departmentId);

        Map<String, Object> params = buildSaveParams(tenantId, currentUserId, name, payload);
        params.put("departmentId", departmentId);
        int updatedRows;
        try {
            updatedRows = departmentDAO.updateDepartment(params);
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_NAME_MESSAGE, ex);
        }
        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부서를 찾을 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, departmentId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DepartmentVO changeUse(
            Long tenantId, Long currentUserId, Long departmentId, String useAt) throws Exception {
        validateTenantId(tenantId);
        if (departmentId == null) {
            throw new IllegalArgumentException("부서 ID가 필요합니다.");
        }
        String flag = normalizeUseAt(useAt);
        DepartmentVO existing = findByIdOrThrow(tenantId, departmentId);
        if (flag.equals(existing.getUseAt())) {
            return existing;
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("departmentId", departmentId);
        if ("N".equals(flag)) {
            if (departmentDAO.countActiveChildren(params) > 0 || departmentDAO.countActiveUsers(params) > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, IN_USE_MESSAGE);
            }
        } else if (existing.getParentDepartmentId() != null) {
            DepartmentVO parent = findByIdOrThrow(tenantId, existing.getParentDepartmentId());
            if (!"Y".equals(parent.getUseAt())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, PARENT_INACTIVE_MESSAGE);
            }
        }
        params.put("useAt", flag);
        params.put("updatedBy", currentUserId);
        if (departmentDAO.updateDepartmentUse(params) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부서를 찾을 수 없습니다.");
        }
        return findByIdOrThrow(tenantId, departmentId);
    }

    @Override
    public List<DepartmentUserVO> listDepartmentUsers(Long tenantId, Long departmentId, String status) throws Exception {
        validateTenantId(tenantId);
        findByIdOrThrow(tenantId, departmentId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("departmentId", departmentId);
        params.put("status", normalizeMemberStatus(status));
        return departmentDAO.selectDepartmentUsers(params);
    }

    @Override
    public String getCompanyName(Long tenantId) throws Exception {
        validateTenantId(tenantId);
        String name = departmentDAO.selectCompanyName(tenantId);
        return name == null ? "" : name;
    }

    @Override
    public List<DepartmentUserVO> listUnassignedUsers(Long tenantId, String status) throws Exception {
        validateTenantId(tenantId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("status", normalizeMemberStatus(status));
        return departmentDAO.selectUnassignedUsers(params);
    }

    private String normalizeMemberStatus(String status) {
        String normalized = StringUtils.hasText(status) ? status.trim().toUpperCase(Locale.ROOT) : "ACTIVE";
        if (!"ACTIVE".equals(normalized) && !"RETIRED".equals(normalized) && !"ALL".equals(normalized)) {
            throw new IllegalArgumentException("재직 구분은 ACTIVE, RETIRED, ALL 중 하나여야 합니다.");
        }
        return normalized;
    }

    private Map<String, Object> buildSaveParams(
            Long tenantId, Long currentUserId, String name, DepartmentSaveRequestVO payload) {
        String description = StringUtils.hasText(payload.getDepartmentDc()) ? payload.getDepartmentDc().trim() : null;
        if (description != null && description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("부서 설명은 " + MAX_DESCRIPTION_LENGTH + "자 이하로 입력해 주세요.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("parentDepartmentId", payload.getParentDepartmentId());
        params.put("departmentNm", name);
        params.put("managerUserId", payload.getManagerUserId());
        params.put("departmentDc", description);
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("createdBy", currentUserId);
        params.put("updatedBy", currentUserId);
        return params;
    }

    private void requireActiveParent(Long tenantId, Long parentId) throws Exception {
        DepartmentVO parent = findOrNull(tenantId, parentId);
        if (parent == null) {
            throw new IllegalArgumentException("상위 부서를 찾을 수 없습니다.");
        }
        if (!"Y".equals(parent.getUseAt())) {
            throw new IllegalArgumentException("사용안함 부서는 상위 부서로 지정할 수 없습니다.");
        }
    }

    /** 새 상위 부서에서 위로 거슬러 올라가며 자기 자신을 만나면(자기 자신 또는 하위 부서) 순환이다. */
    private void requireNoCircularParent(Long tenantId, Long departmentId, Long parentId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("includeInactive", true);
        Map<Long, Long> parentById = new HashMap<>();
        for (DepartmentVO department : departmentDAO.selectDepartmentList(params)) {
            parentById.put(department.getDepartmentId(), department.getParentDepartmentId());
        }
        Set<Long> visited = new HashSet<>();
        Long current = parentId;
        while (current != null && visited.add(current)) {
            if (current.equals(departmentId)) {
                throw new IllegalArgumentException("자기 자신 또는 하위 부서를 상위 부서로 지정할 수 없습니다.");
            }
            current = parentById.get(current);
        }
    }

    private void requireActiveMember(Long tenantId, Long departmentId, Long managerUserId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("departmentId", departmentId);
        params.put("userId", managerUserId);
        if (!departmentDAO.existsActiveMember(params)) {
            throw new IllegalArgumentException("부서장은 이 부서의 소속 사원만 지정할 수 있습니다.");
        }
    }

    private void requireUniqueName(Long tenantId, Long parentId, String name, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("parentDepartmentId", parentId);
        params.put("departmentNm", name);
        params.put("excludeDepartmentId", excludeId);
        if (departmentDAO.countSiblingName(params) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE_NAME_MESSAGE);
        }
    }

    private DepartmentVO findOrNull(Long tenantId, Long departmentId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("departmentId", departmentId);
        return departmentDAO.selectDepartmentById(params);
    }

    private DepartmentVO findByIdOrThrow(Long tenantId, Long departmentId) throws Exception {
        if (departmentId == null) {
            throw new IllegalArgumentException("부서 ID가 필요합니다.");
        }
        DepartmentVO department = findOrNull(tenantId, departmentId);
        if (department == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "부서를 찾을 수 없습니다.");
        }
        return department;
    }

    private String requireName(String value) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("부서명은 필수입니다.");
        }
        String name = value.trim();
        if (name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("부서명은 " + MAX_NAME_LENGTH + "자 이하로 입력해 주세요.");
        }
        return name;
    }

    private String normalizeUseAt(String value) {
        String normalized = StringUtils.hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : "";
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("사용 여부는 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private void validatePayload(DepartmentSaveRequestVO payload) {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
    }
}
