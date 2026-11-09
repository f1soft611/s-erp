package egovframework.let.sales.statement.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.statement.service.impl.SalesStatementServiceImpl;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import lombok.Getter;
import lombok.Setter;

@RestController
@RequestMapping("/api/v1/sales/statements")
public class SalesStatementApiController {
    private final ResultVoHelper results;
    private final SalesStatementServiceImpl service;
    private final SystemMenuService menus;

    public SalesStatementApiController(ResultVoHelper results, SalesStatementServiceImpl service, SystemMenuService menus) {
        this.results = results;
        this.service = service;
        this.menus = menus;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO create(@RequestBody SaveRequest payload, @AuthenticationPrincipal LoginVO user) throws Exception {
        require(user, "statement-create", Action.CREATE);
        if (payload == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "명세서 내용을 입력해 주세요.");
        return result("item", service.create(user.getTenantId(), user.getId(),
                payload.getSalesDeliveryId(), payload.getStatementDt(), payload.getRemark()));
    }

    @GetMapping("/source-deliveries")
    public ResultVO sources(@RequestParam(required = false) String keyword,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        require(user, "statement-create", Action.READ);
        return result("items", service.sources(user.getTenantId(), user.getId(), keyword));
    }

    @GetMapping("/status")
    public ResultVO status(@RequestParam String statementDtFrom, @RequestParam String statementDtTo,
            @RequestParam(required = false) String keyword, @AuthenticationPrincipal LoginVO user) throws Exception {
        require(user, "statement-status", Action.READ);
        return result("items", service.status(user.getTenantId(), user.getId(), statementDtFrom, statementDtTo, keyword));
    }

    @GetMapping("/{id}")
    public ResultVO get(@PathVariable Long id, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireReadEither(user);
        return result("item", service.get(user.getTenantId(), user.getId(), id));
    }

    @PutMapping("/{id}")
    public ResultVO update(@PathVariable Long id, @RequestBody SaveRequest payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        require(user, "statement-create", Action.UPDATE);
        if (payload == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "명세서 내용을 입력해 주세요.");
        return result("item", service.update(user.getTenantId(), user.getId(), id,
                payload.getStatementDt(), payload.getRemark()));
    }

    @DeleteMapping("/{id}")
    public ResultVO delete(@PathVariable Long id, @AuthenticationPrincipal LoginVO user) throws Exception {
        require(user, "statement-create", Action.DELETE);
        service.delete(user.getTenantId(), user.getId(), id);
        return result("message", "거래명세서가 삭제되었습니다.");
    }

    private ResultVO result(String key, Object value) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put(key, value);
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireReadEither(LoginVO user) throws Exception {
        MyMenuResponseVO tree = menuTree(user);
        if (!permitted(tree, "statement-create", Action.READ) && !permitted(tree, "statement-status", Action.READ)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private void require(LoginVO user, String key, Action action) throws Exception {
        if (!permitted(menuTree(user), key, action)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private MyMenuResponseVO menuTree(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() < 1 || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        return menus.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
    }

    private boolean permitted(MyMenuResponseVO tree, String key, Action action) {
        if (tree == null || tree.getMenus() == null) return false;
        for (MenuTreeNodeVO module : tree.getMenus()) {
            if ("/sales".equals(trimTrailingSlash(module.getPath())) && hasPermission(module.getChildren(), key, action)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasPermission(List<MenuTreeNodeVO> nodes, String key, Action action) {
        if (nodes == null) return false;
        for (MenuTreeNodeVO node : nodes) {
            String path = trimTrailingSlash(node.getPath());
            MenuPermissionVO permission = node.getPermissions();
            if (path.endsWith("/" + key) && permission != null) {
                switch (action) {
                    case READ: if (permission.isRead()) return true; break;
                    case CREATE: if (permission.isCreate()) return true; break;
                    case UPDATE: if (permission.isUpdate()) return true; break;
                    case DELETE: if (permission.isDelete()) return true; break;
                    default: break;
                }
            }
            if (hasPermission(node.getChildren(), key, action)) return true;
        }
        return false;
    }

    private String trimTrailingSlash(String path) {
        if (path == null) return "";
        return path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }

    private enum Action { READ, CREATE, UPDATE, DELETE }

    @Getter
    @Setter
    public static class SaveRequest {
        private Long salesDeliveryId;
        private String statementDt;
        private String remark;
    }
}
