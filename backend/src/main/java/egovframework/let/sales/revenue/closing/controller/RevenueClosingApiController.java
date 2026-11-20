package egovframework.let.sales.revenue.closing.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.util.StringUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseRequestVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingSearchVO;
import egovframework.let.sales.revenue.closing.service.RevenueClosingService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@RestController
@RequestMapping("/api/v1/sales/revenue-closings")
public class RevenueClosingApiController {
    private final ResultVoHelper results;
    private final RevenueClosingService service;
    private final SystemMenuService menus;

    public RevenueClosingApiController(ResultVoHelper results, RevenueClosingService service,
            SystemMenuService menus) {
        this.results = results;
        this.service = service;
        this.menus = menus;
    }

    @GetMapping("/search")
    public ResultVO search(@ModelAttribute RevenueClosingSearchVO search,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireRead(user);
        RevenueClosingResponseVO response = service.search(user.getTenantId(), user.getId(), search);

        Map<String, Object> values = new HashMap<String, Object>();
        values.put("details", response.getDetails());
        values.put("customerSummaries", response.getCustomerSummaries());
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @PostMapping("/close")
    public ResultVO close(@RequestBody RevenueClosingCloseRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireCreate(user);
        Map<String, Object> values = new HashMap<String, Object>();
        RevenueClosingCloseResponseVO response = service.close(user.getTenantId(), user.getId(), request);
        values.put("closedCount", response.getClosedCount());
        values.put("items", response.getItems());
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireRead(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId().longValue() < 1L
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        MyMenuResponseVO tree = menus.getMyMenuTree(user.getTenantId(), user.getId(),
                user.getRoleId(), user.getRoleCode());
        if (!permitted(tree)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private boolean permitted(MyMenuResponseVO tree) {
        if (tree == null || tree.getMenus() == null) {
            return false;
        }
        for (MenuTreeNodeVO module : tree.getMenus()) {
            if ("/sales".equals(trimTrailingSlash(module.getPath()))
                    && hasReadPermission(module.getChildren())) {
                return true;
            }
        }
        return false;
    }

    private void requireCreate(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId().longValue() < 1L
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        MyMenuResponseVO tree = menus.getMyMenuTree(user.getTenantId(), user.getId(),
                user.getRoleId(), user.getRoleCode());
        if (!hasCreatePermission(tree == null ? null : tree.getMenus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private boolean hasCreatePermission(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) {
            return false;
        }
        for (MenuTreeNodeVO node : nodes) {
            MenuPermissionVO permission = node.getPermissions();
            if (trimTrailingSlash(node.getPath()).endsWith("/revenue-closing")
                    && permission != null && permission.isCreate()) {
                return true;
            }
            if (hasCreatePermission(node.getChildren())) {
                return true;
            }
        }
        return false;
    }

    private boolean hasReadPermission(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) {
            return false;
        }
        for (MenuTreeNodeVO node : nodes) {
            MenuPermissionVO permission = node.getPermissions();
            if (trimTrailingSlash(node.getPath()).endsWith("/revenue-closing")
                    && permission != null && permission.isRead()) {
                return true;
            }
            if (hasReadPermission(node.getChildren())) {
                return true;
            }
        }
        return false;
    }

    private String trimTrailingSlash(String path) {
        if (path == null) {
            return "";
        }
        return path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }
}
