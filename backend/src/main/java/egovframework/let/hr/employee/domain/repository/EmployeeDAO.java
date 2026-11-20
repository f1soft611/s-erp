package egovframework.let.hr.employee.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.hr.employee.domain.model.EmployeePickerVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;

@Repository("employeeDAO")
public class EmployeeDAO extends EgovAbstractMapper {

    public List<EmployeeVO> selectEmployeeList(Map<String, Object> params) throws Exception {
        return selectList("EmployeeDAO.selectEmployeeList", params);
    }

    public EmployeeVO selectEmployeeById(Map<String, Object> params) throws Exception {
        return selectOne("EmployeeDAO.selectEmployeeById", params);
    }

    /** 사원 선택 도움창용 목록(선택에 필요한 항목만). */
    public List<EmployeePickerVO> selectPickerEmployees(Map<String, Object> params) throws Exception {
        return selectList("EmployeeDAO.selectPickerEmployees", params);
    }

    /** 같은 사번을 쓰는 사원 수(excludeUserId는 제외). */
    public int countEmployeeNo(Map<String, Object> params) throws Exception {
        return count("EmployeeDAO.countEmployeeNo", params);
    }

    public int countEmail(Map<String, Object> params) throws Exception {
        return count("EmployeeDAO.countEmail", params);
    }

    public int countResidentHash(Map<String, Object> params) throws Exception {
        return count("EmployeeDAO.countResidentHash", params);
    }

    public int countLoginCode(Map<String, Object> params) throws Exception {
        return count("EmployeeDAO.countLoginCode", params);
    }

    /** 사용 중인 같은 테넌트 부서인지. */
    public boolean existsActiveDepartment(Map<String, Object> params) throws Exception {
        return exists("EmployeeDAO.existsActiveDepartment", params);
    }

    /** 공통코드 그룹의 사용 중인 항목인지(groupCode, itemCode). */
    public boolean existsCommonCodeItem(Map<String, Object> params) throws Exception {
        return exists("EmployeeDAO.existsCommonCodeItem", params);
    }

    /** 직급(LEVEL 그룹)의 사용 중인 항목 ID인지. */
    public boolean existsLevel(Map<String, Object> params) throws Exception {
        return exists("EmployeeDAO.existsLevel", params);
    }

    public Long insertEmployee(Map<String, Object> params) throws Exception {
        return selectOne("EmployeeDAO.insertEmployee", params);
    }

    public int updateEmployee(Map<String, Object> params) throws Exception {
        return update("EmployeeDAO.updateEmployee", params);
    }

    public Long insertLoginAccount(Map<String, Object> params) throws Exception {
        return selectOne("EmployeeDAO.insertLoginAccount", params);
    }

    /** 신규 계정에 기본 역할(DEFAULT_USER)을 부여한다. 역할이 없으면 0을 돌려준다. */
    public int insertDefaultRole(Map<String, Object> params) throws Exception {
        return update("EmployeeDAO.insertDefaultRole", params);
    }

    public int updateLoginProfileImage(Map<String, Object> params) throws Exception {
        return update("EmployeeDAO.updateLoginProfileImage", params);
    }

    private int count(String statement, Map<String, Object> params) throws Exception {
        Integer value = selectOne(statement, params);
        return value == null ? 0 : value;
    }

    private boolean exists(String statement, Map<String, Object> params) throws Exception {
        Boolean value = selectOne(statement, params);
        return Boolean.TRUE.equals(value);
    }
}
