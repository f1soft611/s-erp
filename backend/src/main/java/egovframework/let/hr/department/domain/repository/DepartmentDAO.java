package egovframework.let.hr.department.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.hr.department.domain.model.DepartmentUserVO;
import egovframework.let.hr.department.domain.model.DepartmentVO;

@Repository("departmentDAO")
public class DepartmentDAO extends EgovAbstractMapper {

    public List<DepartmentVO> selectDepartmentList(Map<String, Object> params) throws Exception {
        return selectList("DepartmentDAO.selectDepartmentList", params);
    }

    public DepartmentVO selectDepartmentById(Map<String, Object> params) throws Exception {
        return selectOne("DepartmentDAO.selectDepartmentById", params);
    }

    public Long insertDepartment(Map<String, Object> params) throws Exception {
        return selectOne("DepartmentDAO.insertDepartment", params);
    }

    public int updateDepartment(Map<String, Object> params) throws Exception {
        return update("DepartmentDAO.updateDepartment", params);
    }

    public int updateDepartmentUse(Map<String, Object> params) throws Exception {
        return update("DepartmentDAO.updateDepartmentUse", params);
    }

    /** 같은 상위 부서 아래 동일 부서명 개수(자기 자신 제외). */
    public int countSiblingName(Map<String, Object> params) throws Exception {
        Integer count = selectOne("DepartmentDAO.countSiblingName", params);
        return count == null ? 0 : count;
    }

    /** 사용 중인 직계 하위 부서 수. */
    public int countActiveChildren(Map<String, Object> params) throws Exception {
        Integer count = selectOne("DepartmentDAO.countActiveChildren", params);
        return count == null ? 0 : count;
    }

    /** 사용 중인 소속 사원 수. */
    public int countActiveUsers(Map<String, Object> params) throws Exception {
        Integer count = selectOne("DepartmentDAO.countActiveUsers", params);
        return count == null ? 0 : count;
    }

    /** 해당 사원이 그 부서의 사용 중인 소속 사원인지(부서장 지정 자격). */
    public boolean existsActiveMember(Map<String, Object> params) throws Exception {
        Boolean exists = selectOne("DepartmentDAO.existsActiveMember", params);
        return Boolean.TRUE.equals(exists);
    }

    public List<DepartmentUserVO> selectDepartmentUsers(Map<String, Object> params) throws Exception {
        return selectList("DepartmentDAO.selectDepartmentUsers", params);
    }

    /** 부서 트리 최상단에 표시할 회사명(tb_tenant.tenant_nm, 회사정보 화면과 같은 값). */
    public String selectCompanyName(Long tenantId) throws Exception {
        return selectOne("DepartmentDAO.selectCompanyName", tenantId);
    }

    /** 부서가 지정되지 않은 사용 중인 사원(params: tenantId, status). */
    public List<DepartmentUserVO> selectUnassignedUsers(Map<String, Object> params) throws Exception {
        return selectList("DepartmentDAO.selectUnassignedUsers", params);
    }
}
