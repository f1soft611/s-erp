package egovframework.let.system.accounts.controller;

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
import egovframework.let.system.accounts.domain.model.AccountRolesRequestVO;
import egovframework.let.system.accounts.domain.model.AccountStatusRequestVO;
import egovframework.let.system.accounts.domain.model.AccountVO;
import egovframework.let.system.accounts.service.AccountService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** 계정관리. 계정 정보와 임시 비밀번호를 다루므로 모든 API가 테넌트 관리자 전용이다. 계정 발급은 사원관리에서 한다. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/accounts")
@Tag(name = "AccountApiController", description = "계정 관리")
public class AccountApiController {

    private final ResultVoHelper resultVoHelper;
    private final AccountService accountService;

    @GetMapping
    public ResultVO listAccounts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("resultList", accountService.listAccounts(user.getTenantId(), keyword, status));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PutMapping("/{loginId}/status")
    public ResultVO updateStatus(
            @PathVariable Long loginId,
            @RequestBody AccountStatusRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        String useAt = payload == null ? null : payload.getUseAt();
        return itemResult(accountService.updateStatus(
                user.getTenantId(), resolveUserId(user), user.getId(), loginId, useAt));
    }

    @PostMapping("/{loginId}/password-reset")
    public ResultVO resetPassword(
            @PathVariable Long loginId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("item", accountService.resetPassword(user.getTenantId(), resolveUserId(user), loginId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping("/{loginId}/unlock")
    public ResultVO unlock(
            @PathVariable Long loginId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return itemResult(accountService.unlock(user.getTenantId(), resolveUserId(user), loginId));
    }

    @PutMapping("/{loginId}/roles")
    public ResultVO updateRoles(
            @PathVariable Long loginId,
            @RequestBody AccountRolesRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return itemResult(accountService.updateRoles(
                user.getTenantId(), resolveUserId(user), loginId, payload == null ? null : payload.getRoleIds()));
    }

    private ResultVO itemResult(AccountVO item) {
        Map<String, Object> resultMap = new HashMap<String, Object>();
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
        Map<String, Object> errorMap = new HashMap<String, Object>();
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
