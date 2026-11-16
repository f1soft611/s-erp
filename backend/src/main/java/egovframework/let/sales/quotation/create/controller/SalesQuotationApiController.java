package egovframework.let.sales.quotation.create.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationCreateRequestVO;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationVO;
import egovframework.let.sales.quotation.create.service.SalesQuotationService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@RestController
@RequestMapping("/api/v1/sales/quotations")
public class SalesQuotationApiController {
    private final ResultVoHelper resultHelper;
    private final SalesQuotationService service;
    private final SystemMenuService menus;
    public SalesQuotationApiController(ResultVoHelper resultHelper, SalesQuotationService service, SystemMenuService menus) {
        this.resultHelper = resultHelper; this.service = service; this.menus = menus;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO create(@RequestBody SalesQuotationCreateRequestVO request, @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "create");
        return item(service.createQuotation(user.getTenantId(), user.getId(), request));
    }

    @GetMapping("/{quotationId}")
    public ResultVO get(@PathVariable Long quotationId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireUser(user);
        return item(service.getQuotation(user.getTenantId(), user.getId(), quotationId));
    }

    @PutMapping("/{quotationId}")
    public ResultVO update(@PathVariable Long quotationId, @RequestBody SalesQuotationCreateRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "update");
        return item(service.updateQuotation(user.getTenantId(), user.getId(), quotationId, request));
    }

    @DeleteMapping("/{quotationId}")
    public ResultVO delete(@PathVariable Long quotationId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, "delete");
        service.deleteQuotation(user.getTenantId(), user.getId(), quotationId);
        Map<String, Object> values = new HashMap<>();
        values.put("message", "견적이 삭제되었습니다.");
        return resultHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/options")
    public ResultVO options(@RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String keyword, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireUser(user);
        List<SalesQuotationVO> list = service.options(user.getTenantId(), user.getId(), customerId, keyword);
        Map<String, Object> values = new HashMap<>();
        values.put("resultList", list); values.put("resultCnt", list.size());
        return resultHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }
    private ResultVO item(SalesQuotationVO quotation) {
        Map<String, Object> values = new HashMap<>(); values.put("item", quotation);
        return resultHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }
    private void requireUser(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
    }
    private void requirePermission(LoginVO user, String action) throws Exception {
        requireUser(user);
        MyMenuResponseVO tree = menus.getMyMenuTree(user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                if ("/sales".equals(trimPath(module.getPath())) && permitted(module.getChildren(), action)) return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "메뉴 권한이 없습니다.");
    }
    private boolean permitted(List<MenuTreeNodeVO> nodes, String action) {
        if (nodes == null) return false;
        for (MenuTreeNodeVO node : nodes) {
            MenuPermissionVO p = node.getPermissions();
            if (trimPath(node.getPath()).endsWith("/quotation-create") && p != null
                    && (("create".equals(action) && p.isCreate()) || ("update".equals(action) && p.isUpdate())
                    || ("delete".equals(action) && p.isDelete()))) return true;
            if (permitted(node.getChildren(), action)) return true;
        }
        return false;
    }
    private String trimPath(String path) {
        if (path == null) return "";
        return path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }
}
