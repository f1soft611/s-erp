package egovframework.let.sales.statement.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.statement.service.impl.SalesStatementServiceImpl;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class SalesStatementApiControllerTest {
    @Mock private SalesStatementServiceImpl service;
    @Mock private SystemMenuService menus;
    private SalesStatementApiController controller;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new SalesStatementApiController(new ResultVoHelper(), service, menus);
        user = new LoginVO();
        user.setTenantId(9L);
        user.setId("user-1");
        user.setRoleCode("TENANT_USER");
    }

    @Test
    void deniesCreateWithoutCreatePermission() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(false));
        SalesStatementApiController.SaveRequest request = new SalesStatementApiController.SaveRequest();
        request.setSalesDeliveryId(7L);
        request.setStatementDt("2026-11-09");
        assertThatThrownBy(() -> controller.create(request, user))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(service);
    }

    @Test
    void allowsStatusOnlyReadAndUsesAuthenticatedTenant() throws Exception {
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/sales");
        MenuTreeNodeVO menu = new MenuTreeNodeVO();
        menu.setPath("/sales/delivery/statement-status");
        menu.setPermissions(new MenuPermissionVO(true, false, false, false));
        module.setChildren(Collections.singletonList(menu));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(module));
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree);
        when(service.get(9L, "user-1", 7L)).thenReturn(Collections.<String, Object>emptyMap());

        controller.get(7L, user);

        verify(service).get(9L, "user-1", 7L);
    }

    @Test
    void rejectsUpdateWithReadOnlyPermission() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(false));
        SalesStatementApiController.SaveRequest request = new SalesStatementApiController.SaveRequest();
        request.setStatementDt("2026-11-09");
        assertThatThrownBy(() -> controller.update(7L, request, user))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(service);
    }

    private MyMenuResponseVO tree(boolean create) {
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/sales");
        MenuTreeNodeVO menu = new MenuTreeNodeVO();
        menu.setPath("/sales/delivery/statement-create");
        menu.setPermissions(new MenuPermissionVO(true, create, false, false));
        module.setChildren(Arrays.asList(menu));
        MyMenuResponseVO result = new MyMenuResponseVO();
        result.setMenus(Collections.singletonList(module));
        return result;
    }
}
