package egovframework.let.system.menus.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSearchConditionVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.domain.repository.SystemMenuDAO;
import egovframework.let.system.menus.service.SystemMenuService;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.service.SystemModuleService;

/**
 * 메뉴 관리를 위한 서비스 구현 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Service("systemMenuService")
public class SystemMenuServiceImpl extends EgovAbstractServiceImpl implements SystemMenuService {

    private static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";
    private static final String TENANT_ADMIN = "TENANT_ADMIN";

    private final SystemMenuDAO systemMenuDAO;
    private final SystemModuleService systemModuleService;

    public SystemMenuServiceImpl(SystemMenuDAO systemMenuDAO, SystemModuleService systemModuleService) {
        this.systemMenuDAO = systemMenuDAO;
        this.systemModuleService = systemModuleService;
    }

    @Override
    public List<SystemMenuVO> listMenus(Long tenantId, Long moduleId) throws Exception {
        SystemMenuSearchConditionVO condition = new SystemMenuSearchConditionVO();
        condition.setTenantId(tenantId);
        condition.setModuleId(moduleId);
        List<SystemMenuVO> menus = systemMenuDAO.selectMenuList(condition);
        Map<Long, List<String>> permissionCodesByMenuId = new HashMap<>();
        for (SystemMenuVO menu : menus) {
            permissionCodesByMenuId.put(menu.getMenuId(), new ArrayList<>());
        }
        for (Map<String, Object> row : systemMenuDAO.selectMenuPermissionCodeRows(condition)) {
            Long menuId = ((Number) row.get("menuId")).longValue();
            List<String> permissionCodes = permissionCodesByMenuId.get(menuId);
            if (permissionCodes != null) {
                permissionCodes.add((String) row.get("permissionCode"));
            }
        }
        for (SystemMenuVO menu : menus) {
            menu.setPermissionCodes(permissionCodesByMenuId.get(menu.getMenuId()));
        }
        return menus;
    }

    @Override
    @Transactional
    public SystemMenuVO createMenu(Long tenantId, SystemMenuSaveRequestVO payload) throws Exception {
        if (payload.getModuleId() == null) {
            throw new IllegalArgumentException("모듈은 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getMenuCode())) {
            throw new IllegalArgumentException("메뉴 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getMenuNm())) {
            throw new IllegalArgumentException("메뉴명은 필수입니다.");
        }

        validateModuleOwnership(tenantId, payload.getModuleId());
        validateParentMenu(tenantId, payload.getParentMenuId(), payload.getModuleId());
        validateMenuCodeDuplication(tenantId, payload.getMenuCode(), null);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("moduleId", payload.getModuleId());
        params.put("parentMenuId", payload.getParentMenuId());
        params.put("menuCode", payload.getMenuCode().trim());
        params.put("menuNm", payload.getMenuNm().trim());
        params.put("menuUrl", payload.getMenuUrl());
        params.put("iconNm", payload.getIconNm());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");

        Long newId = systemMenuDAO.insertMenu(params);
        return findByIdOrThrow(tenantId, newId);
    }

    @Override
    @Transactional
    public SystemMenuVO updateMenu(Long tenantId, Long menuId, SystemMenuSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getMenuNm())) {
            throw new IllegalArgumentException("메뉴명은 필수입니다.");
        }

        SystemMenuVO existingMenu = findByIdOrThrow(tenantId, menuId);
        validateModuleOwnership(tenantId, existingMenu.getModuleId());
        validateParentMenu(tenantId, payload.getParentMenuId(), existingMenu.getModuleId());

        String menuCode = payload.getMenuCode() == null ? null : payload.getMenuCode().trim();
        if (StringUtils.hasText(menuCode)) {
            validateMenuCodeDuplication(tenantId, menuCode, menuId);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("menuId", menuId);
        params.put("tenantId", tenantId);
        params.put("parentMenuId", payload.getParentMenuId());
        params.put("menuNm", payload.getMenuNm().trim());
        params.put("menuUrl", payload.getMenuUrl());
        params.put("iconNm", payload.getIconNm());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        systemMenuDAO.updateMenu(params);

        return findByIdOrThrow(tenantId, menuId);
    }

    @Override
    @Transactional
    public SystemMenuVO replaceMenuPermissions(Long tenantId, Long menuId,
            SystemMenuPermissionSaveRequestVO payload) throws Exception {
        findByIdOrThrow(tenantId, menuId);

        Map<String, Object> params = new HashMap<>();
        params.put("menuId", menuId);
        params.put("tenantId", tenantId);
        if (systemMenuDAO.countChildMenus(params) > 0) {
            throw new IllegalArgumentException("하위 메뉴가 있는 메뉴에는 버튼 권한을 설정할 수 없습니다.");
        }

        List<String> permissionCodes = normalizePermissionCodes(payload == null ? null : payload.getPermissionCodes());
        if (!permissionCodes.isEmpty()
                && systemMenuDAO.countActivePermissionCodes(permissionCodes) != permissionCodes.size()) {
            throw new IllegalArgumentException("유효하지 않은 권한 코드입니다.");
        }

        systemMenuDAO.deleteMenuPermissions(menuId);
        if (!permissionCodes.isEmpty()) {
            systemMenuDAO.insertMenuPermissions(menuId, permissionCodes);
        }
        return findByIdOrThrow(tenantId, menuId);
    }

    @Override
    @Transactional
    public void deleteMenu(Long tenantId, Long menuId) throws Exception {
        findByIdOrThrow(tenantId, menuId);

        Map<String, Object> params = new HashMap<>();
        params.put("menuId", menuId);
        params.put("tenantId", tenantId);

        int childCount = systemMenuDAO.countChildMenus(params);
        if (childCount > 0) {
            throw new IllegalArgumentException("하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.");
        }

        systemMenuDAO.deleteMenuPermissions(menuId);
        systemMenuDAO.deleteMenu(params);
    }

    @Override
    public MyMenuResponseVO getMyMenuTree(Long tenantId, String userId, String roleCode) throws Exception {
        List<SystemModuleVO> modules = systemModuleService.listModules(tenantId).stream()
                .filter(module -> "Y".equalsIgnoreCase(module.getUseAt()))
                .collect(Collectors.toList());
        List<SystemMenuVO> menus = systemMenuDAO.selectActiveMenusForTenant(tenantId);

        MenuPermissionVO permission = resolvePermission(roleCode);

        List<MenuTreeNodeVO> tree = new ArrayList<>();
        for (SystemModuleVO module : modules) {
            MenuTreeNodeVO moduleNode = new MenuTreeNodeVO();
            moduleNode.setMenuId(module.getModuleId());
            moduleNode.setParentMenuId(null);
            moduleNode.setName(module.getModuleNm());
            moduleNode.setIcon(module.getIconNm());
            moduleNode.setPath(module.getModuleUrl());
            moduleNode.setChildren(buildMenuChildren(menus, module.getModuleId(), null, permission));
            tree.add(moduleNode);
        }

        MyMenuResponseVO response = new MyMenuResponseVO();
        MyMenuResponseVO.UserSummary user = new MyMenuResponseVO.UserSummary();
        user.setUserId(userId);
        user.setRoles(Collections.singletonList(roleCode));
        response.setUser(user);
        response.setMenus(tree);
        return response;
    }

    private List<MenuTreeNodeVO> buildMenuChildren(
            List<SystemMenuVO> menus, Long moduleId, Long parentMenuId, MenuPermissionVO permission) {
        List<MenuTreeNodeVO> result = new ArrayList<>();
        for (SystemMenuVO menu : menus) {
            boolean sameModule = moduleId.equals(menu.getModuleId());
            boolean sameParent = parentMenuId == null
                    ? menu.getParentMenuId() == null
                    : parentMenuId.equals(menu.getParentMenuId());
            if (!sameModule || !sameParent) {
                continue;
            }

            MenuTreeNodeVO node = new MenuTreeNodeVO();
            node.setMenuId(menu.getMenuId());
            node.setParentMenuId(menu.getParentMenuId());
            node.setName(menu.getMenuNm());
            node.setIcon(menu.getIconNm());
            node.setPath(menu.getMenuUrl());

            List<MenuTreeNodeVO> children = buildMenuChildren(menus, moduleId, menu.getMenuId(), permission);
            if (!children.isEmpty()) {
                node.setChildren(children);
            } else {
                node.setPermissions(permission);
            }
            result.add(node);
        }
        return result;
    }

    private MenuPermissionVO resolvePermission(String roleCode) {
        boolean isAdmin = PLATFORM_ADMIN.equals(roleCode) || TENANT_ADMIN.equals(roleCode);
        if (isAdmin) {
            return new MenuPermissionVO(true, true, true, true);
        }
        return new MenuPermissionVO(true, false, false, false);
    }

    private SystemMenuVO findByIdOrThrow(Long tenantId, Long menuId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("menuId", menuId);
        params.put("tenantId", tenantId);
        SystemMenuVO menu = systemMenuDAO.selectMenuById(params);
        if (menu == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다.");
        }
        populatePermissionCodes(menu);
        return menu;
    }

    private void populatePermissionCodes(SystemMenuVO menu) throws Exception {
        menu.setPermissionCodes(systemMenuDAO.selectMenuPermissionCodes(menu.getMenuId()));
    }

    private void validateModuleOwnership(Long tenantId, Long moduleId) throws Exception {
        boolean ownedModule = systemModuleService.listModules(tenantId).stream()
                .anyMatch(module -> moduleId.equals(module.getModuleId()));
        if (!ownedModule) {
            throw new IllegalArgumentException("유효하지 않은 모듈입니다.");
        }
    }

    private void validateParentMenu(Long tenantId, Long parentMenuId, Long moduleId) throws Exception {
        if (parentMenuId == null) {
            return;
        }

        Map<String, Object> params = new HashMap<>();
        params.put("menuId", parentMenuId);
        params.put("tenantId", tenantId);
        SystemMenuVO parentMenu = systemMenuDAO.selectMenuById(params);
        if (parentMenu == null) {
            throw new IllegalArgumentException("유효하지 않은 상위 메뉴입니다.");
        }
        if (!moduleId.equals(parentMenu.getModuleId())) {
            throw new IllegalArgumentException("상위 메뉴는 같은 모듈에 속해야 합니다.");
        }
    }

    private List<String> normalizePermissionCodes(List<String> permissionCodes) {
        if (permissionCodes == null || permissionCodes.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> normalizedCodes = new LinkedHashSet<>();
        for (String permissionCode : permissionCodes) {
            if (StringUtils.hasText(permissionCode)) {
                normalizedCodes.add(permissionCode.trim());
            }
        }
        return new ArrayList<>(normalizedCodes);
    }

    private void validateMenuCodeDuplication(Long tenantId, String menuCode, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("menuCode", menuCode);
        Long existingId = systemMenuDAO.selectMenuIdByCode(params);
        if (existingId != null && (excludeId == null || !excludeId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 메뉴 코드입니다.");
        }
    }
}
