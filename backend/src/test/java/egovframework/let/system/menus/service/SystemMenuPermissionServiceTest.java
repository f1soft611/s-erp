package egovframework.let.system.menus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSearchConditionVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.domain.repository.SystemMenuDAO;
import egovframework.let.system.menus.service.impl.SystemMenuServiceImpl;
import egovframework.let.system.modules.service.SystemModuleService;

class SystemMenuPermissionServiceTest {

    private final Long tenantId = 1L;
    private final Long menuId = 11L;

    @Test
    void replaceMenuPermissionsReplacesNormalizedCodesForLeafMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO menu = menu(menuId);
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu);
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "CREATE"))).thenReturn(2);
        when(systemMenuDAO.selectMenuPermissionCodes(menuId)).thenReturn(Arrays.asList("READ", "CREATE"));

        SystemMenuVO result = service.replaceMenuPermissions(
                tenantId, menuId, request(" READ ", "CREATE", "READ", " "));

        assertEquals(Arrays.asList("READ", "CREATE"), result.getPermissionCodes());
        verify(systemMenuDAO).deleteMenuPermissions(menuId);
        verify(systemMenuDAO).insertMenuPermissions(menuId, Arrays.asList("READ", "CREATE"));
    }

    @Test
    void replaceMenuPermissionsRejectsGroupMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(1);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.replaceMenuPermissions(tenantId, menuId, request("READ")));

        assertEquals("하위 메뉴가 있는 메뉴에는 버튼 권한을 설정할 수 없습니다.", exception.getMessage());
    }

    @Test
    void replaceMenuPermissionsRejectsUnknownOrInactiveCodes() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "UNKNOWN"))).thenReturn(1);

        assertThrows(IllegalArgumentException.class,
                () -> service.replaceMenuPermissions(tenantId, menuId, request("READ", "UNKNOWN")));
    }

        @Test
        void replaceMenuPermissionsRejectsInactiveCodeWithoutChangingMappings() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "INACTIVE"))).thenReturn(1);

        assertThrows(IllegalArgumentException.class,
            () -> service.replaceMenuPermissions(tenantId, menuId, request("READ", "INACTIVE", "READ")));

        verify(systemMenuDAO, never()).deleteMenuPermissions(menuId);
        verify(systemMenuDAO, never()).insertMenuPermissions(
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyList());
        }

    @Test
    void listMenusUsesOneBulkPermissionQueryAndPopulatesCodesInDaoOrder() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO firstMenu = menu(menuId);
        SystemMenuVO secondMenu = menu(12L);
        when(systemMenuDAO.selectMenuList(org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
            .thenReturn(Arrays.asList(firstMenu, secondMenu));
        when(systemMenuDAO.selectMenuPermissionCodeRows(
                org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenReturn(Arrays.asList(
                    permissionCodeRow(menuId, "READ"),
                    permissionCodeRow(menuId, "EXCEL"),
                    permissionCodeRow(12L, "CREATE")));

        List<SystemMenuVO> result = service.listMenus(tenantId, 2L);

        verify(systemMenuDAO).selectMenuList(argThat(condition -> tenantId.equals(condition.getTenantId())
            && Long.valueOf(2L).equals(condition.getModuleId())));
        verify(systemMenuDAO, times(1)).selectMenuPermissionCodeRows(argThat(condition -> tenantId.equals(condition.getTenantId())
            && Long.valueOf(2L).equals(condition.getModuleId())));
        verify(systemMenuDAO, never()).selectMenuPermissionCodes(org.mockito.ArgumentMatchers.anyLong());
        assertEquals(Arrays.asList("READ", "EXCEL"), result.get(0).getPermissionCodes());
        assertEquals(Collections.singletonList("CREATE"), result.get(1).getPermissionCodes());
    }

    @Test
    void deleteMenuDeletesPermissionMappingsBeforeMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);

        service.deleteMenu(tenantId, menuId);

        InOrder inOrder = inOrder(systemMenuDAO);
        inOrder.verify(systemMenuDAO).deleteMenuPermissions(menuId);
        inOrder.verify(systemMenuDAO).deleteMenu(anyMap());
    }

    private SystemMenuPermissionSaveRequestVO request(String... codes) {
        SystemMenuPermissionSaveRequestVO request = new SystemMenuPermissionSaveRequestVO();
        request.setPermissionCodes(Arrays.asList(codes));
        return request;
    }

    private SystemMenuVO menu(Long id) {
        SystemMenuVO menu = new SystemMenuVO();
        menu.setMenuId(id);
        return menu;
    }

    private Map<String, Object> permissionCodeRow(Long menuId, String permissionCode) {
        Map<String, Object> row = new HashMap<>();
        row.put("menuId", menuId);
        row.put("permissionCode", permissionCode);
        return row;
    }
}