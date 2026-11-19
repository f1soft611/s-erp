package egovframework.let.hr.employee.controller;

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
import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.service.EmployeeService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** 사원 관리. 개인정보를 다루므로 조회를 포함해 모든 API가 테넌트 관리자 전용이다. 삭제 API는 없다(퇴사일로 퇴직 처리). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hr/employees")
@Tag(name = "EmployeeApiController", description = "사원 관리")
public class EmployeeApiController {

    private final ResultVoHelper resultVoHelper;
    private final EmployeeService employeeService;

    @GetMapping
    public ResultVO listEmployees(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long departmentId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", employeeService.listEmployees(user.getTenantId(), keyword, status, departmentId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/check-employee-no")
    public ResultVO checkEmployeeNo(
            @RequestParam String employeeNo,
            @RequestParam(required = false) Long userId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("available", employeeService.isEmployeeNoAvailable(user.getTenantId(), employeeNo, userId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/check-login-code")
    public ResultVO checkLoginCode(
            @RequestParam String loginCode,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("available", employeeService.isLoginCodeAvailable(user.getTenantId(), loginCode));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/{userId}")
    public ResultVO getEmployee(
            @PathVariable Long userId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return itemResult(employeeService.getEmployee(user.getTenantId(), userId));
    }

    @PostMapping
    public ResponseEntity<ResultVO> createEmployee(
            @RequestBody EmployeeSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        EmployeeVO created = employeeService.createEmployee(user.getTenantId(), resolveUserId(user), payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemResult(created));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ResultVO> updateEmployee(
            @PathVariable Long userId,
            @RequestBody EmployeeSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        EmployeeVO updated = employeeService.updateEmployee(user.getTenantId(), resolveUserId(user), userId, payload);
        return ResponseEntity.ok(itemResult(updated));
    }

    private ResultVO itemResult(EmployeeVO item) {
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
