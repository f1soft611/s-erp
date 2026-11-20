package egovframework.let.hr.department.service;

import java.util.List;

import egovframework.let.hr.department.domain.model.DepartmentSaveRequestVO;
import egovframework.let.hr.department.domain.model.DepartmentUserVO;
import egovframework.let.hr.department.domain.model.DepartmentVO;

public interface DepartmentService {

    /** 부서 전체 목록. includeInactive가 false면 사용안함 부서는 제외한다. */
    List<DepartmentVO> listDepartments(Long tenantId, boolean includeInactive) throws Exception;

    DepartmentVO createDepartment(Long tenantId, Long currentUserId, DepartmentSaveRequestVO payload) throws Exception;

    DepartmentVO updateDepartment(Long tenantId, Long currentUserId, Long departmentId,
            DepartmentSaveRequestVO payload) throws Exception;

    /** 사용안함(N)·복원(Y). 부서는 삭제하지 않는다. */
    DepartmentVO changeUse(Long tenantId, Long currentUserId, Long departmentId, String useAt) throws Exception;

    /** 부서 소속 사원. status는 ACTIVE(재직·휴직, 기본)/RETIRED(퇴직)/ALL. */
    List<DepartmentUserVO> listDepartmentUsers(Long tenantId, Long departmentId, String status) throws Exception;

    /** 부서 트리의 최상단(회사) 이름. 회사정보의 회사명을 그대로 따른다. 없으면 빈 문자열. */
    String getCompanyName(Long tenantId) throws Exception;

    /** 부서가 지정되지 않은 사용 중인 사원(회사 노드를 선택했을 때 보여 준다). status는 소속 사원 조회와 같다. */
    List<DepartmentUserVO> listUnassignedUsers(Long tenantId, String status) throws Exception;
}
