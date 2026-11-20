package egovframework.let.hr.order.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
import egovframework.let.hr.order.domain.model.HrOrderProcessRequestVO;
import egovframework.let.hr.order.domain.model.HrOrderProcessResultVO;
import egovframework.let.hr.order.service.HrOrderService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** 인사명령. 인사 정보를 바꾸고 이력을 다루므로 모든 API가 테넌트 관리자 전용이다. 이력은 수정·삭제 API가 없다. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/hr/orders")
@Tag(name = "HrOrderApiController", description = "인사명령")
public class HrOrderApiController {

    private final ResultVoHelper resultVoHelper;
    private final HrOrderService hrOrderService;

    @GetMapping("/types")
    public ResultVO listTypes(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", hrOrderService.listTypes());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping("/process")
    public ResponseEntity<ResultVO> process(
            @RequestBody HrOrderProcessRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        HrOrderProcessResultVO result = hrOrderService.process(user.getTenantId(), resolveUserId(user), payload);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", result);
        return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @GetMapping("/history")
    public ResultVO listHistory(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String orderType,
            @RequestParam(required = false) String source,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", hrOrderService.listHistory(user.getTenantId(), from, to, keyword, orderType, source));
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
