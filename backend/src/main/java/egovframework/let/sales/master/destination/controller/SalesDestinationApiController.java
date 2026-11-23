package egovframework.let.sales.master.destination.controller;

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
import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationBatchRequestVO;
import egovframework.let.sales.master.destination.service.SalesDestinationService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@RestController
@RequestMapping("/api/v1/sales/destinations")
public class SalesDestinationApiController {
    private final ResultVoHelper results;
    private final SalesDestinationService service;
    private final SystemMenuService menus;

    public SalesDestinationApiController(ResultVoHelper results, SalesDestinationService service,
            SystemMenuService menus) {
        this.results = results;
        this.service = service;
        this.menus = menus;
    }

    @GetMapping
    public ResultVO list(@RequestParam Long customerId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireUser(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", service.list(user.getTenantId(), customerId));
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/customers")
    public ResultVO customers(@RequestParam(required = false) String keyword,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireUser(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", service.customers(user.getTenantId(), keyword));
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO create(@RequestBody SalesDestinationVO input, @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "create");
        return item(service.create(user.getTenantId(), user.getId(), input));
    }

    @PutMapping("/{id}")
    public ResultVO update(@PathVariable Long id, @RequestBody SalesDestinationVO input,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "update");
        return item(service.update(user.getTenantId(), user.getId(), id, input));
    }

    @PostMapping("/save-batch")
    public ResultVO saveBatch(@RequestBody SalesDestinationBatchRequestVO input,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireUser(user);
        if (input == null || input.getInsertedRows() == null || input.getUpdatedRows() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장 요청을 확인해 주세요.");
        }
        if (!input.getInsertedRows().isEmpty()) requirePermission(user, "create");
        if (!input.getUpdatedRows().isEmpty()) requirePermission(user, "update");
        service.saveBatch(user.getTenantId(), user.getId(), input.getCustomerId(),
                input.getInsertedRows(), input.getUpdatedRows());
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("message", "납품처가 저장되었습니다.");
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @DeleteMapping("/{id}")
    public ResultVO delete(@PathVariable Long id, @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "delete");
        service.delete(user.getTenantId(), id);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("message", "납품처가 삭제되었습니다.");
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private ResultVO item(SalesDestinationVO value) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", value);
        return results.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireUser(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void requirePermission(LoginVO user, String action) throws Exception {
        requireUser(user);
        MyMenuResponseVO tree = menus.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                if ("/sales".equals(module.getPath()) && permitted(module.getChildren(), action)) return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "메뉴 권한이 없습니다.");
    }

    private boolean permitted(List<MenuTreeNodeVO> nodes, String action) {
        if (nodes == null) return false;
        for (MenuTreeNodeVO node : nodes) {
            MenuPermissionVO permission = node.getPermissions();
            if ("/sales/master/destinations".equals(node.getPath()) && permission != null
                    && (("create".equals(action) && permission.isCreate())
                    || ("update".equals(action) && permission.isUpdate())
                    || ("delete".equals(action) && permission.isDelete()))) return true;
            if (permitted(node.getChildren(), action)) return true;
        }
        return false;
    }
}
