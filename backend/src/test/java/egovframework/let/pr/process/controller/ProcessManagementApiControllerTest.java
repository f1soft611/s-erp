package egovframework.let.pr.process.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.service.ProcessManagementService;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class ProcessManagementApiControllerTest {
    @Test
    void deniesInsertWithoutCreatePermission() throws Exception {
        ProcessManagementService service = mock(ProcessManagementService.class);
        SystemMenuService menuService = mock(SystemMenuService.class);
        ProcessManagementApiController controller = new ProcessManagementApiController(
                service, menuService, mock(ResultVoHelper.class));
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        MenuTreeNodeVO node = new MenuTreeNodeVO();
        node.setPath("/pr/master/process-management");
        node.setPermissions(new MenuPermissionVO(true, false, true, true));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(node));
        when(menuService.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode()))
                .thenReturn(tree);
        ProcessChangesVO changes = new ProcessChangesVO();
        changes.setInsertedRows(Collections.singletonList(new ProcessNodeVO()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> controller.save(user, changes));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsUnauthenticatedRead() {
        ProcessManagementService service = mock(ProcessManagementService.class);
        ProcessManagementApiController controller = new ProcessManagementApiController(
                service, mock(SystemMenuService.class), mock(ResultVoHelper.class));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> controller.list(null));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(service);
    }
}
