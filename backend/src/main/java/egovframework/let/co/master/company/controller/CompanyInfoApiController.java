package egovframework.let.co.master.company.controller;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.company.domain.model.CompanyInfoVO;
import egovframework.let.co.master.company.service.CompanyInfoService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/company")
@Tag(name = "CompanyInfoApiController", description = "회사정보 관리")
public class CompanyInfoApiController {

    private static final List<String> COMPANY_MENU_KEYS =
            Arrays.asList("company-info", "company");

    private final ResultVoHelper resultVoHelper;
    private final CompanyInfoService companyInfoService;
    private final SystemMenuService systemMenuService;

    @GetMapping
    public ResultVO getCompanyInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.READ);
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("item", companyInfoService.getCompanyInfo(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PutMapping
    public ResponseEntity<ResultVO> updateCompanyInfo(
            @RequestBody CompanyInfoVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.UPDATE);
        try {
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", companyInfoService.updateCompanyInfo(user.getTenantId(), payload));
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<String, Object>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
        }
    }

    private MenuPermissionVO requirePermission(LoginVO user, PermissionAction action) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId().longValue() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        MyMenuResponseVO tree = systemMenuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                List<String> moduleSegments = pathSegments(module.getPath());
                if (!moduleSegments.isEmpty() && "co".equals(moduleSegments.get(0))) {
                    MenuPermissionVO permissions = findCompanyPermissions(module.getChildren());
                    if (permissions != null && (action == PermissionAction.READ
                            ? permissions.isRead() : permissions.isUpdate())) {
                        return permissions;
                    }
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
    }

    private MenuPermissionVO findCompanyPermissions(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) {
            return null;
        }
        for (MenuTreeNodeVO node : nodes) {
            List<String> segments = pathSegments(node.getPath());
            String pageKey = segments.isEmpty() ? null : segments.get(segments.size() - 1);
            if (COMPANY_MENU_KEYS.contains(pageKey) && node.getPermissions() != null) {
                return node.getPermissions();
            }
            MenuPermissionVO permissions = findCompanyPermissions(node.getChildren());
            if (permissions != null) {
                return permissions;
            }
        }
        return null;
    }

    private List<String> pathSegments(String path) {
        if (path == null) {
            return Collections.emptyList();
        }
        List<String> segments = new ArrayList<String>();
        for (String segment : path.split("/")) {
            if (!segment.isEmpty()) {
                segments.add(segment);
            }
        }
        return segments;
    }

    private enum PermissionAction {
        READ, UPDATE
    }
}
