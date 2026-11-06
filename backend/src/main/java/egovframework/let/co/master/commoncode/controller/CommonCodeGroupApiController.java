package egovframework.let.co.master.commoncode.controller;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveResultVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSearchCondition;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.service.CommonCodeBatchService;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/common-code")
@Tag(name = "CommonCodeGroupApiController", description = "공통코드 관리")
public class CommonCodeGroupApiController {

    private final ResultVoHelper resultVoHelper;
    private final CommonCodeBatchService commonCodeBatchService;
    private final CommonCodeGroupService commonCodeGroupService;
    private final CommonCodeItemService commonCodeItemService;
    private final SystemMenuService systemMenuService;

    @PostMapping("/save-batch")
    public ResponseEntity<ResultVO> saveBatch(
            @RequestBody CommonCodeBatchSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        MenuPermissionVO permissions = requirePermission(user, PermissionAction.WRITE);
        boolean deletesGroups = payload != null && payload.getGroups() != null
                && !payload.getGroups().getDeletedRows().isEmpty();
        boolean deletesItems = payload != null && payload.getItems() != null
                && !payload.getItems().getDeletedRows().isEmpty();
        if ((deletesGroups || deletesItems) && !permissions.isDelete()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
        try {
            CommonCodeBatchSaveResultVO result = commonCodeBatchService.saveBatch(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", result);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @GetMapping("/groups")
    public ResultVO listGroups(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String groupCode,
            @RequestParam(required = false) String groupNm,
            @RequestParam(required = false) String groupDc,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        if (hasSearchValue(keyword) || hasSearchValue(groupCode) || hasSearchValue(groupNm) || hasSearchValue(groupDc)) {
            CommonCodeGroupSearchCondition condition = new CommonCodeGroupSearchCondition();
            condition.setKeyword(keyword);
            condition.setGroupCode(groupCode);
            condition.setGroupNm(groupNm);
            condition.setGroupDc(groupDc);
            resultMap.put("resultList", commonCodeGroupService.listGroups(user.getTenantId(), condition));
        } else {
            resultMap.put("resultList", commonCodeGroupService.listGroups(user.getTenantId()));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private boolean hasSearchValue(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @PostMapping("/groups")
    public ResponseEntity<ResultVO> createGroup(
            @RequestBody CommonCodeGroupSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.WRITE);
        try {
            CommonCodeGroupVO group = commonCodeGroupService.createGroup(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", group);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping("/groups/{groupId}")
    public ResponseEntity<ResultVO> updateGroup(
            @PathVariable Long groupId,
            @RequestBody CommonCodeGroupSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.WRITE);
        try {
            CommonCodeGroupVO group = commonCodeGroupService.updateGroup(user.getTenantId(), groupId, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", group);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<ResultVO> deleteGroup(
            @PathVariable Long groupId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.DELETE);
        try {
            commonCodeGroupService.deleteGroup(user.getTenantId(), groupId);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "공통코드 그룹이 삭제되었습니다.");
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @GetMapping("/groups/{groupId}/items")
    public ResultVO listItems(
            @PathVariable Long groupId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", commonCodeItemService.listItems(user.getTenantId(), groupId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/groups/{groupId}/parent-items")
    public ResultVO listParentItems(
            @PathVariable Long groupId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", commonCodeItemService.listParentItems(user.getTenantId(), groupId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping("/groups/{groupId}/items")
    public ResponseEntity<ResultVO> createItem(
            @PathVariable Long groupId,
            @RequestBody CommonCodeItemSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.WRITE);
        try {
            CommonCodeItemVO item = commonCodeItemService.createItem(user.getTenantId(), groupId, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", item);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping("/groups/{groupId}/items/{itemId}")
    public ResponseEntity<ResultVO> updateItem(
            @PathVariable Long groupId,
            @PathVariable Long itemId,
            @RequestBody CommonCodeItemSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.WRITE);
        try {
            CommonCodeItemVO item = commonCodeItemService.updateItem(user.getTenantId(), groupId, itemId, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", item);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @DeleteMapping("/groups/{groupId}/items/{itemId}")
    public ResponseEntity<ResultVO> deleteItem(
            @PathVariable Long groupId,
            @PathVariable Long itemId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePermission(user, PermissionAction.DELETE);
        try {
            commonCodeItemService.deleteItem(user.getTenantId(), groupId, itemId);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("message", "상세코드가 삭제되었습니다.");
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    private ResponseEntity<ResultVO> badRequest(String message) {
        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR, message));
    }

    private MenuPermissionVO requirePermission(LoginVO user, PermissionAction action) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        MyMenuResponseVO tree = systemMenuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                List<String> segments = pathSegments(module.getPath());
                if (!segments.isEmpty() && "co".equals(segments.get(0))) {
                    MenuPermissionVO permissions = findCommonCodePermissions(module.getChildren());
                    if (permissions != null && (action == PermissionAction.DELETE
                            ? permissions.isDelete() : permissions.isCreate() || permissions.isUpdate())) {
                        return permissions;
                    }
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
    }

    private MenuPermissionVO findCommonCodePermissions(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) {
            return null;
        }
        for (MenuTreeNodeVO node : nodes) {
            List<String> segments = pathSegments(node.getPath());
            String pageKey = segments.isEmpty() ? null : segments.get(segments.size() - 1);
            if (("cmncodes".equals(pageKey) || "common-code".equals(pageKey))
                    && node.getPermissions() != null) {
                return node.getPermissions();
            }
            MenuPermissionVO permissions = findCommonCodePermissions(node.getChildren());
            if (permissions != null) {
                return permissions;
            }
        }
        return null;
    }

    private List<String> pathSegments(String path) {
        return path == null ? Collections.emptyList()
                : Arrays.stream(path.split("/")).filter(segment -> !segment.isEmpty()).collect(Collectors.toList());
    }

    private enum PermissionAction {
        WRITE, DELETE
    }
}
