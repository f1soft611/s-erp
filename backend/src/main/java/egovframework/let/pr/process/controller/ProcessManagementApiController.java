package egovframework.let.pr.process.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.service.ProcessManagementService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pr/processes")
public class ProcessManagementApiController {
    private final ProcessManagementService service;
    private final SystemMenuService menuService;
    private final ResultVoHelper results;

    @GetMapping
    public ResultVO list(@AuthenticationPrincipal LoginVO user) throws Exception {
        MenuPermissionVO permissions = requirePermissions(user);
        if (!permissions.isRead()) throw forbidden();
        return result(service.list(user.getTenantId()));
    }

    @PostMapping("/save-batch")
    public ResultVO save(@AuthenticationPrincipal LoginVO user, @RequestBody ProcessChangesVO changes) throws Exception {
        MenuPermissionVO permissions = requirePermissions(user);
        if (changes == null || changes.getInsertedRows() == null || changes.getUpdatedRows() == null
                || changes.getDeletedRows() == null) throw new IllegalArgumentException("변경 행을 확인해 주세요.");
        if ((!changes.getInsertedRows().isEmpty() && !permissions.isCreate())
                || (!changes.getUpdatedRows().isEmpty() && !permissions.isUpdate())
                || (!changes.getDeletedRows().isEmpty() && !permissions.isDelete())) throw forbidden();
        return result(service.save(user.getTenantId(), changes));
    }

    private MenuPermissionVO requirePermissions(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트를 확인해 주세요.");
        }
        MyMenuResponseVO tree = menuService.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        MenuPermissionVO permission = tree == null ? null : find(tree.getMenus());
        if (permission == null) throw forbidden();
        return permission;
    }

    private MenuPermissionVO find(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) return null;
        for (MenuTreeNodeVO node : nodes) {
            if ("/pr/master/process-management".equals(node.getPath())) return node.getPermissions();
            MenuPermissionVO child = find(node.getChildren());
            if (child != null) return child;
        }
        return null;
    }

    private ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
    }

    private ResultVO result(Object value) {
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", value);
        return results.buildFromMap(map, ResponseCode.SUCCESS);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> invalid(IllegalArgumentException error) {
        Map<String, Object> map = new HashMap<>();
        map.put("message", error.getMessage());
        return ResponseEntity.badRequest().body(results.buildFromMap(map, ResponseCode.INPUT_CHECK_ERROR, error.getMessage()));
    }
}
