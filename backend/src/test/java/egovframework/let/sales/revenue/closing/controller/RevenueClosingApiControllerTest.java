package egovframework.let.sales.revenue.closing.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseRequestVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingSearchVO;
import egovframework.let.sales.revenue.closing.service.RevenueClosingService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class RevenueClosingApiControllerTest {
    @Mock
    private RevenueClosingService service;

    @Mock
    private SystemMenuService menus;

    private RevenueClosingApiController controller;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new RevenueClosingApiController(new ResultVoHelper(), service, menus);
        user = new LoginVO();
        user.setTenantId(9L);
        user.setId("user-1");
        user.setRoleCode("TENANT_USER");
    }

    @Test
    void requiresRevenueClosingReadPermissionAndUsesAuthenticatedTenant() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(true));
        RevenueClosingSearchVO search = new RevenueClosingSearchVO();
        RevenueClosingResponseVO response = new RevenueClosingResponseVO();
        when(service.search(9L, "user-1", search)).thenReturn(response);

        controller.search(search, user);

        verify(service).search(9L, "user-1", search);
    }

    @Test
    void deniesRequestsWithoutRevenueClosingReadPermission() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(false));

        assertThatThrownBy(() -> controller.search(new RevenueClosingSearchVO(), user))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(service);
    }

    @Test
    void closeRequiresRevenueClosingCreatePermission() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(true, true));
        RevenueClosingCloseRequestVO request = new RevenueClosingCloseRequestVO();
        request.setSalesDeliveryDetailIds(Collections.singletonList(150L));
        request.setStatementDt("2026-11-20");
        RevenueClosingCloseResponseVO response = new RevenueClosingCloseResponseVO();
        response.setClosedCount(1);
        response.setItems(Collections.<java.util.Map<String, Object>>emptyList());
        when(service.close(9L, "user-1", request)).thenReturn(response);

        controller.close(request, user);

        verify(service).close(9L, "user-1", request);
    }

    @Test
    void deniesCloseWithoutCreatePermission() throws Exception {
        when(menus.getMyMenuTree(9L, "user-1", null, "TENANT_USER")).thenReturn(tree(true, false));
        RevenueClosingCloseRequestVO request = new RevenueClosingCloseRequestVO();
        request.setSalesDeliveryDetailIds(Collections.singletonList(150L));
        request.setStatementDt("2026-11-20");

        assertThatThrownBy(() -> controller.close(request, user))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(service);
    }

    private MyMenuResponseVO tree(boolean read) {
        return tree(read, false);
    }

    private MyMenuResponseVO tree(boolean read, boolean create) {
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/sales");
        MenuTreeNodeVO menu = new MenuTreeNodeVO();
        menu.setPath("/sales/revenue/revenue-closing");
        menu.setPermissions(new MenuPermissionVO(read, create, false, false));
        module.setChildren(Collections.singletonList(menu));
        MyMenuResponseVO result = new MyMenuResponseVO();
        result.setMenus(Collections.singletonList(module));
        return result;
    }
}
