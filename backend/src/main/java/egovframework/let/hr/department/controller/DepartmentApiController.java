package egovframework.let.hr.department.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.hr.department.domain.model.DepartmentSaveRequestVO;
import egovframework.let.hr.department.domain.model.DepartmentUseRequestVO;
import egovframework.let.hr.department.domain.model.DepartmentVO;
import egovframework.let.hr.department.service.DepartmentService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hr/departments")
@Tag(name = "DepartmentApiController", description = "부서 관리")
public class DepartmentApiController {

    private final ResultVoHelper resultVoHelper;
    private final DepartmentService departmentService;

    @GetMapping
    public ResultVO listDepartments(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", departmentService.listDepartments(user.getTenantId(), includeInactive));
        resultMap.put("companyName", departmentService.getCompanyName(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/unassigned/users")
    public ResultVO listUnassignedUsers(
            @RequestParam(required = false) String status,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", departmentService.listUnassignedUsers(user.getTenantId(), status));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/{departmentId}/users")
    public ResultVO listDepartmentUsers(
            @PathVariable Long departmentId,
            @RequestParam(required = false) String status,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", departmentService.listDepartmentUsers(user.getTenantId(), departmentId, status));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping
    public ResponseEntity<ResultVO> createDepartment(
            @RequestBody DepartmentSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        DepartmentVO created = departmentService.createDepartment(user.getTenantId(), resolveUserId(user), payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemResult(created));
    }

    @PutMapping("/{departmentId}")
    public ResponseEntity<ResultVO> updateDepartment(
            @PathVariable Long departmentId,
            @RequestBody DepartmentSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        DepartmentVO updated = departmentService.updateDepartment(
                user.getTenantId(), resolveUserId(user), departmentId, payload);
        return ResponseEntity.ok(itemResult(updated));
    }

    @PutMapping("/{departmentId}/use")
    public ResponseEntity<ResultVO> changeUse(
            @PathVariable Long departmentId,
            @RequestBody DepartmentUseRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        DepartmentVO changed = departmentService.changeUse(
                user.getTenantId(), resolveUserId(user), departmentId, payload == null ? null : payload.getUseAt());
        return ResponseEntity.ok(itemResult(changed));
    }

    private ResultVO itemResult(DepartmentVO item) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", item);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> handleInputError(IllegalArgumentException ex) {
        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
    }

    private Long resolveUserId(LoginVO user) {
        if (user == null || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
    }
}
