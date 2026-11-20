package egovframework.let.hr.employee.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.hr.employee.domain.model.EmployeePickerVO;
import egovframework.let.hr.employee.service.EmployeeService;

/** 사원 선택 도움창 API는 관리자가 아닌 일반 사용자도 조회할 수 있다(개인정보는 내려주지 않는다). */
class EmployeePickerApiControllerTest {

    private static LoginVO normalUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setId("hong.gd");
        user.setRoleCode("TENANT_USER");
        return user;
    }

    @Test
    void aNormalUserCanListAndTheTenantComesFromTheLogin() throws Exception {
        EmployeeService service = mock(EmployeeService.class);
        EmployeePickerVO row = new EmployeePickerVO();
        row.setUserId(5L);
        List<EmployeePickerVO> rows = Collections.singletonList(row);
        when(service.listPickerEmployees(1L, 7L, "홍")).thenReturn(rows);
        EmployeePickerApiController controller = new EmployeePickerApiController(new ResultVoHelper(), service);

        ResultVO response = controller.listPickerEmployees(7L, "홍", normalUser());

        assertEquals(rows, response.getResult().get("resultList"));
        verify(service).listPickerEmployees(1L, 7L, "홍");
    }

    @Test
    void invalidInputBecomesA400WithTheMessage() throws Exception {
        EmployeePickerApiController controller = new EmployeePickerApiController(new ResultVoHelper(), mock(EmployeeService.class));

        ResponseEntity<ResultVO> response = controller.handleInputError(new IllegalArgumentException("검색어는 100자 이하여야 합니다."));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("검색어는 100자 이하여야 합니다.", response.getBody().getResult().get("message"));
    }
}
