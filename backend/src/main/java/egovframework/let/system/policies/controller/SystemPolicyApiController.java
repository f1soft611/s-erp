package egovframework.let.system.policies.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
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
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.service.SystemPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 현재 테넌트 시스템 정책 관리 컨트롤러 (PLATFORM_ADMIN 전용)
 * @author S-ERP
 * @since 2026.11.05
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/system/policies")
@Tag(name = "SystemPolicyApiController", description = "시스템 정책 관리")
public class SystemPolicyApiController {

    private static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";

    private final ResultVoHelper resultVoHelper;
    private final SystemPolicyService systemPolicyService;

    @Operation(summary = "시스템 정책 목록 조회", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping
    public ResultVO listPolicies(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        return result("resultList", systemPolicyService.listPolicies(user.getTenantId()), null);
    }

    @Operation(summary = "시스템 정책 등록", security = { @SecurityRequirement(name = "Authorization") })
    @PostMapping
    public ResultVO createPolicy(@RequestBody SystemPolicySaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        Long actorId = resolveActor(user);
        return result("item", systemPolicyService.createPolicy(user.getTenantId(), actorId, payload),
                "정책이 등록되었습니다.");
    }

    @Operation(summary = "시스템 정책 수정", security = { @SecurityRequirement(name = "Authorization") })
    @PutMapping("/{policyId}")
    public ResultVO updatePolicy(@PathVariable("policyId") Long policyId, @RequestBody SystemPolicySaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        Long actorId = resolveActor(user);
        return result("item", systemPolicyService.updatePolicy(user.getTenantId(), actorId, policyId, payload),
                "정책이 저장되었습니다.");
    }

    @Operation(summary = "시스템 정책 삭제", security = { @SecurityRequirement(name = "Authorization") })
    @DeleteMapping("/{policyId}")
    public ResultVO deletePolicy(@PathVariable("policyId") Long policyId,
            @RequestParam(value = "version", required = false) Integer version,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        Long actorId = resolveActor(user);
        if (version == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "삭제 기준 버전이 필요합니다.");
        }
        systemPolicyService.deletePolicy(user.getTenantId(), actorId, policyId, version);
        return result(null, null, "정책이 삭제되었습니다.");
    }

    @Operation(summary = "시스템 정책 변경 이력 조회", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/{policyId}/history")
    public ResultVO listHistory(@PathVariable("policyId") Long policyId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        return result("resultList", systemPolicyService.listHistory(user.getTenantId(), policyId), null);
    }

    @Operation(summary = "USER_LIST 정책 사용자 검색", security = { @SecurityRequirement(name = "Authorization") })
    @GetMapping("/users")
    public ResultVO searchUsers(@RequestParam(value = "keyword", required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requirePlatformAdmin(user);
        return result("resultList", systemPolicyService.searchUsers(user.getTenantId(), keyword), null);
    }

    private ResultVO result(String key, Object value, String message) {
        Map<String, Object> resultMap = new HashMap<String, Object>();
        if (key != null) {
            resultMap.put(key, value);
        }
        if (message != null) {
            resultMap.put("message", message);
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private void requirePlatformAdmin(LoginVO user) {
        String roleCode = user == null ? null : user.getRoleCode();
        if (user == null || user.getTenantId() == null || roleCode == null || !PLATFORM_ADMIN.equals(roleCode.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "시스템 정책 관리 권한이 없습니다.");
        }
    }

    private Long resolveActor(LoginVO user) {
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "사용자 정보를 확인할 수 없습니다.");
        }
    }
}