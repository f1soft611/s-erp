package egovframework.let.hr.employee.service.impl;

import java.util.HashSet;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.hr.employee.domain.model.EmployeeBatchChangeSetVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveResultVO;
import egovframework.let.hr.employee.domain.model.EmployeeChangeVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.service.EmployeeBatchService;
import egovframework.let.hr.employee.service.EmployeeService;

@Service("employeeBatchService")
public class EmployeeBatchServiceImpl extends EgovAbstractServiceImpl implements EmployeeBatchService {

    private final EmployeeService employeeService;

    public EmployeeBatchServiceImpl(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmployeeBatchSaveResultVO saveBatch(Long tenantId, Long currentUserId, EmployeeBatchSaveRequestVO payload)
            throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        EmployeeBatchChangeSetVO changes = payload.getEmployees() == null
                ? new EmployeeBatchChangeSetVO() : payload.getEmployees();
        if (!changes.getDeletedRows().isEmpty()) {
            throw new IllegalArgumentException("사원은 삭제할 수 없습니다. 퇴사일을 입력해 퇴직 처리해 주세요.");
        }
        for (EmployeeChangeVO row : changes.getInsertedRows()) {
            validateRow(row);
        }
        for (EmployeeChangeVO row : changes.getUpdatedRows()) {
            validateRow(row);
            requireUserId(row.getUserId());
        }
        Set<String> requestIds = new HashSet<String>();
        for (EmployeeChangeVO row : changes.getInsertedRows()) {
            rememberRequestId(requestIds, row);
        }
        for (EmployeeChangeVO row : changes.getUpdatedRows()) {
            rememberRequestId(requestIds, row);
        }

        EmployeeBatchSaveResultVO result = new EmployeeBatchSaveResultVO();
        for (EmployeeChangeVO row : changes.getInsertedRows()) {
            EmployeeVO saved;
            try {
                saved = employeeService.createEmployee(tenantId, currentUserId, row);
            } catch (Exception ex) {
                throw withEmployeeName(ex, row);
            }
            result.getEmployees().add(saved);
            if (StringUtils.hasText(row.getUserId())) {
                result.getRowIdMappings().put(row.getUserId(), saved.getUserId());
            }
        }
        for (EmployeeChangeVO row : changes.getUpdatedRows()) {
            EmployeeVO saved;
            try {
                saved = employeeService.updateEmployee(tenantId, currentUserId, requireUserId(row.getUserId()), row);
            } catch (Exception ex) {
                throw withEmployeeName(ex, row);
            }
            result.getEmployees().add(saved);
            result.getRowIdMappings().put(row.getUserId(), saved.getUserId());
        }
        return result;
    }

    private void validateRow(EmployeeChangeVO row) {
        if (row == null) {
            throw new IllegalArgumentException("사원 변경 행이 비어 있습니다.");
        }
        if (!StringUtils.hasText(row.getUserNm())) {
            throw new IllegalArgumentException("이름은 필수입니다.");
        }
    }

    private void rememberRequestId(Set<String> requestIds, EmployeeChangeVO row) {
        if (StringUtils.hasText(row.getUserId()) && !requestIds.add(row.getUserId())) {
            throw new IllegalArgumentException("사원 요청 행 ID가 중복되었습니다.");
        }
    }

    private Long requireUserId(String value) {
        if (value != null && value.trim().matches("[0-9]+")) {
            try {
                Long id = Long.valueOf(value.trim());
                if (id > 0) {
                    return id;
                }
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("사원 수정 시 올바른 ID가 필요합니다.", ex);
            }
        }
        throw new IllegalArgumentException("사원 수정 시 올바른 ID가 필요합니다.");
    }

    /** 어느 사원의 오류인지 알 수 있게 메시지 앞에 사원명을 붙이고, 오류 종류(입력 오류·상태 코드)는 그대로 유지한다. */
    private Exception withEmployeeName(Exception ex, EmployeeChangeVO row) {
        String prefix = row.getUserNm().trim() + ": ";
        if (ex instanceof ResponseStatusException) {
            ResponseStatusException status = (ResponseStatusException) ex;
            return new ResponseStatusException(status.getStatus(), prefix + status.getReason(), status);
        }
        if (ex instanceof IllegalArgumentException) {
            return new IllegalArgumentException(prefix + ex.getMessage(), ex);
        }
        return ex;
    }
}
