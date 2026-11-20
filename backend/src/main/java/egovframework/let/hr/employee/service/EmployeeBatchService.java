package egovframework.let.hr.employee.service;

import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveResultVO;

/** 사원 일괄 저장(공통 행 폼의 적용 → 화면 저장). 한 트랜잭션에서 등록 행 → 수정 행 순서로 저장한다. */
public interface EmployeeBatchService {

    EmployeeBatchSaveResultVO saveBatch(Long tenantId, Long currentUserId, EmployeeBatchSaveRequestVO payload)
            throws Exception;
}
