package egovframework.let.hr.order.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.hr.order.domain.model.HrOrderProcessRequestVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessResultVO;
import egovframework.let.hr.order.service.HrOrderService;

class HrOrderApiControllerTest {

    private static LoginVO user(String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setId("admin");
        user.setUniqId("9");
        user.setRoleCode(roleCode);
        return user;
    }

    private static HrOrderApiController controller(HrOrderService service) {
        return new HrOrderApiController(new ResultVoHelper(), service);
    }

    @Test
    void anAdministratorProcessesAnOrderWithTheTenantAndUserFromTheLogin() throws Exception {
        HrOrderService service = mock(HrOrderService.class);
        HrOrderProcessRequestVO payload = new HrOrderProcessRequestVO();
        HrOrderProcessResultVO result = new HrOrderProcessResultVO();
        when(service.process(1L, 9L, payload)).thenReturn(result);

        ResponseEntity<ResultVO> response = controller(service).process(payload, user("PLATFORM_ADMIN"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(result, response.getBody().getResult().get("item"));
    }

    @Test
    void aNormalUserIsRefusedForEveryEndpointBeforeAnythingHappens() throws Exception {
        HrOrderService service = mock(HrOrderService.class);
        HrOrderApiController controller = controller(service);
        LoginVO normal = user("TENANT_USER");

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> controller.process(new HrOrderProcessRequestVO(), normal)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> controller.listHistory(null, null, null, null, null, normal)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> controller.listTypes(normal)).getStatus());
        verify(service, never()).process(any(), any(), any());
        verify(service, never()).listHistory(any(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void inputErrorsBecomeBadRequestWithTheMessage() {
        ResponseEntity<ResultVO> response = controller(mock(HrOrderService.class))
                .handleInputError(new IllegalArgumentException("홍길동: 현재와 같은 부서입니다."));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}
