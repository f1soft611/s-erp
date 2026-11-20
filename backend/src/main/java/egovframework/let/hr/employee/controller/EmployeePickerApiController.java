package egovframework.let.hr.employee.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.hr.employee.service.EmployeeService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 사원 선택 도움창 조회. 창고 담당자 선택처럼 일반 사용자 화면에서도 쓰므로 관리자 전용이 아니며,
 * 그 대신 선택에 필요한 항목(사원·부서·직위·사진)만 내려준다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hr/employee-picker")
@Tag(name = "EmployeePickerApiController", description = "사원 선택 도움창")
public class EmployeePickerApiController {

    private final ResultVoHelper resultVoHelper;
    private final EmployeeService employeeService;

    @GetMapping
    public ResultVO listPickerEmployees(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", employeeService.listPickerEmployees(user.getTenantId(), departmentId, keyword));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> handleInputError(IllegalArgumentException ex) {
        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
    }
}
