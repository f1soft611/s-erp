package egovframework.let.sales.master.destination.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationBatchRequestVO;
import egovframework.let.sales.master.destination.service.SalesDestinationService;
import egovframework.let.system.menus.service.SystemMenuService;

class SalesDestinationApiControllerTest {
    @Test
    void unauthenticatedUsersCannotListOrChangeDestinations() throws Exception {
        SalesDestinationService service = mock(SalesDestinationService.class);
        SalesDestinationApiController controller = new SalesDestinationApiController(
                mock(ResultVoHelper.class), service, mock(SystemMenuService.class));
        assertThatThrownBy(() -> controller.list(12L, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThatThrownBy(() -> controller.create(new SalesDestinationVO(), null))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(service);
    }

    @Test
    void userWithoutMenuPermissionCannotCreate() throws Exception {
        SalesDestinationService service = mock(SalesDestinationService.class);
        SalesDestinationApiController controller = new SalesDestinationApiController(
                mock(ResultVoHelper.class), service, mock(SystemMenuService.class));
        LoginVO user = new LoginVO();
        user.setTenantId(71L);
        user.setId("user");
        assertThatThrownBy(() -> controller.create(new SalesDestinationVO(), user))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(service);
    }

    @Test
    void batchCreateRequiresCreatePermission() throws Exception {
        SalesDestinationService service = mock(SalesDestinationService.class);
        SalesDestinationApiController controller = new SalesDestinationApiController(
                mock(ResultVoHelper.class), service, mock(SystemMenuService.class));
        LoginVO user = new LoginVO();
        user.setTenantId(71L);
        user.setId("user");
        SalesDestinationBatchRequestVO request = new SalesDestinationBatchRequestVO();
        request.setCustomerId(12L);
        request.setInsertedRows(java.util.Collections.singletonList(new SalesDestinationVO()));
        request.setUpdatedRows(java.util.Collections.<SalesDestinationVO>emptyList());
        assertThatThrownBy(() -> controller.saveBatch(request, user))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(service);
    }
}
