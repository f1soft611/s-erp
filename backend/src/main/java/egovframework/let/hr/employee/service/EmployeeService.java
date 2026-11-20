package egovframework.let.hr.employee.service;

import java.util.List;

import egovframework.let.hr.employee.domain.model.EmployeePickerVO;
import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;

public interface EmployeeService {

    /**
     * 사원 목록. status는 ACTIVE(재직·휴직, 기본)/RETIRED(퇴직)/ALL, keyword는 이름·영문이름·사번·부서·직위·아이디·전화·이메일 부분 일치.
     */
    List<EmployeeVO> listEmployees(Long tenantId, String keyword, String status, Long departmentId) throws Exception;

    EmployeeVO getEmployee(Long tenantId, Long userId) throws Exception;

    /**
     * 사원 선택 도움창용 조회(재직·휴직 사원, 퇴직 제외). departmentId가 있으면 그 부서에 직접 소속된 사원만, 없으면 전체.
     * keyword는 사원명·사번·직위·부서명에 적용한다. 선택에 필요한 항목만 돌려주며 관리자가 아니어도 호출할 수 있다.
     */
    List<EmployeePickerVO> listPickerEmployees(Long tenantId, Long departmentId, String keyword) throws Exception;

    /** 등록. 실사용자이면 로그인 계정까지 같은 트랜잭션에서 발급한다. */
    EmployeeVO createEmployee(Long tenantId, Long currentUserId, EmployeeSaveRequestVO payload) throws Exception;

    /** 수정(직접 수정 이력을 남긴다). 사번은 바꿀 수 없고(사번이 없던 기존 사원은 한 번 지정 가능), 주민등록번호는 입력한 경우에만 교체한다. */
    EmployeeVO updateEmployee(Long tenantId, Long currentUserId, Long userId, EmployeeSaveRequestVO payload)
            throws Exception;

    /**
     * 수정. recordHistory가 false이면 직접 수정 이력을 남기지 않는다(인사명령 처리가 자기 이력을 따로 남기므로 중복을 피할 때 쓴다).
     */
    EmployeeVO updateEmployee(Long tenantId, Long currentUserId, Long userId, EmployeeSaveRequestVO payload,
            boolean recordHistory) throws Exception;

    /** 사번 사용 가능 여부(자기 자신 excludeUserId는 제외). */
    boolean isEmployeeNoAvailable(Long tenantId, String employeeNo, Long excludeUserId) throws Exception;

    /** 로그인 아이디 사용 가능 여부(형식 검사 후 중복 확인). 로그인 아이디를 비우면 사번이 아이디가 된다. */
    boolean isLoginCodeAvailable(Long tenantId, String loginCode) throws Exception;
}
