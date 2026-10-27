package egovframework.let.co.master.classification.controller;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.classification.domain.model.ClassificationCreateRequestVO;
import egovframework.let.co.master.classification.domain.model.ClassificationKind;
import egovframework.let.co.master.classification.domain.model.ClassificationSaveRequestVO;
import egovframework.let.co.master.classification.service.ClassificationService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/classifications")
public class ClassificationApiController {
    private final ResultVoHelper resultVoHelper;
    private final ClassificationService classificationService;
    private final SystemMenuService systemMenuService;

    @GetMapping("/items")
    public ResultVO listItems(@AuthenticationPrincipal LoginVO user) throws Exception {
        return list(ClassificationKind.ITEM, user);
    }

    @GetMapping("/partners")
    public ResultVO listPartners(@AuthenticationPrincipal LoginVO user) throws Exception {
        return list(ClassificationKind.PARTNER, user);
    }

    @PostMapping("/items")
    public ResponseEntity<ResultVO> createItem(@RequestBody ClassificationCreateRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return create(ClassificationKind.ITEM, payload, user);
    }

    @PostMapping("/partners")
    public ResponseEntity<ResultVO> createPartner(@RequestBody ClassificationCreateRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return create(ClassificationKind.PARTNER, payload, user);
    }

    @PutMapping("/items/{id}")
    public ResultVO updateItem(@PathVariable Long id, @RequestBody ClassificationSaveRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return update(ClassificationKind.ITEM, id, payload, user);
    }

    @PutMapping("/partners/{id}")
    public ResultVO updatePartner(@PathVariable Long id, @RequestBody ClassificationSaveRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return update(ClassificationKind.PARTNER, id, payload, user);
    }

    private ResultVO list(ClassificationKind kind, LoginVO user) throws Exception {
        Long tenantId = requirePermission(kind, user, Operation.READ);
        return result("resultList", classificationService.list(kind, tenantId));
    }

    private ResponseEntity<ResultVO> create(ClassificationKind kind, ClassificationCreateRequestVO payload,
            LoginVO user) throws Exception {
        Long tenantId = requirePermission(kind, user, Operation.CREATE);
        return ResponseEntity.status(HttpStatus.CREATED).body(result("item",
                classificationService.create(kind, tenantId, actor(user), payload)));
    }

    private ResultVO update(ClassificationKind kind, Long id, ClassificationSaveRequestVO payload,
            LoginVO user) throws Exception {
        Long tenantId = requirePermission(kind, user, Operation.UPDATE);
        return result("item", classificationService.update(kind, tenantId, actor(user), id, payload));
    }

    private Long requirePermission(ClassificationKind kind, LoginVO user, Operation operation) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        MyMenuResponseVO tree = systemMenuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        String pageKey = kind == ClassificationKind.ITEM ? "materials" : "customers";
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                List<String> segments = pathSegments(module.getPath());
                if (!segments.isEmpty() && "co".equals(segments.get(0))
                        && hasPermission(module.getChildren(), pageKey, operation)) {
                    return user.getTenantId();
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
    }

    private boolean hasPermission(List<MenuTreeNodeVO> nodes, String pageKey, Operation operation) {
        if (nodes == null) {
            return false;
        }
        for (MenuTreeNodeVO node : nodes) {
            List<String> segments = pathSegments(node.getPath());
            MenuPermissionVO permissions = node.getPermissions();
            if (!segments.isEmpty() && pageKey.equals(segments.get(segments.size() - 1))
                    && permissions != null && permits(permissions, operation)) {
                return true;
            }
            if (hasPermission(node.getChildren(), pageKey, operation)) {
                return true;
            }
        }
        return false;
    }

    private List<String> pathSegments(String path) {
        return path == null ? Collections.emptyList()
                : Arrays.stream(path.split("/")).filter(segment -> !segment.isEmpty()).collect(Collectors.toList());
    }

    private boolean permits(MenuPermissionVO permissions, Operation operation) {
        switch (operation) {
            case CREATE:
                return permissions.isCreate();
            case UPDATE:
                return permissions.isUpdate();
            default:
                return permissions.isRead() || permissions.isCreate() || permissions.isUpdate();
        }
    }

    private String actor(LoginVO user) {
        String value = user.getUniqId();
        if (value == null || value.trim().isEmpty() || value.trim().length() > 10) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
        return value.trim();
    }

    private ResultVO result(String key, Object value) {
        Map<String, Object> values = new HashMap<>();
        values.put(key, value);
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> handleInputError(IllegalArgumentException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(
                resultVoHelper.buildFromMap(error, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ResultVO> handleMalformedRequest(HttpMessageNotReadableException ex) {
        return handleInputError(new IllegalArgumentException("분류 입력 형식과 정수 필드의 값·범위를 확인해 주세요.", ex));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ResultVO> handleInvalidId(MethodArgumentTypeMismatchException ex) {
        return handleInputError(new IllegalArgumentException("분류 ID는 정수여야 합니다.", ex));
    }

    private enum Operation {
        READ, CREATE, UPDATE
    }
}
