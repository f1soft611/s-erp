package egovframework.let.hr.employee.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeBatchSaveResultVO;
import egovframework.let.hr.employee.service.EmployeeBatchService;
import egovframework.let.hr.employee.service.EmployeeService;

class EmployeeBatchApiControllerTest {

    private static LoginVO user(String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setId("admin");
        user.setUniqId("9");
        user.setRoleCode(roleCode);
        return user;
    }

    private static EmployeeApiController controller(EmployeeBatchService batch) {
        return new EmployeeApiController(new ResultVoHelper(), mock(EmployeeService.class), batch);
    }

    @Test
    void anAdministratorSavesTheBatchWithTheTenantAndUserFromTheLogin() throws Exception {
        EmployeeBatchService batch = mock(EmployeeBatchService.class);
        EmployeeBatchSaveRequestVO payload = new EmployeeBatchSaveRequestVO();
        EmployeeBatchSaveResultVO saved = new EmployeeBatchSaveResultVO();
        saved.setEmployees(Collections.emptyList());
        when(batch.saveBatch(1L, 9L, payload)).thenReturn(saved);

        ResponseEntity<ResultVO> response = controller(batch).saveBatch(payload, user("PLATFORM_ADMIN"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(saved, response.getBody().getResult().get("item"));
        verify(batch).saveBatch(1L, 9L, payload);
    }

    @Test
    void aNormalUserIsRefusedBeforeAnythingIsSaved() throws Exception {
        EmployeeBatchService batch = mock(EmployeeBatchService.class);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller(batch).saveBatch(new EmployeeBatchSaveRequestVO(), user("TENANT_USER")));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(batch, never()).saveBatch(1L, 9L, new EmployeeBatchSaveRequestVO());
    }
}
