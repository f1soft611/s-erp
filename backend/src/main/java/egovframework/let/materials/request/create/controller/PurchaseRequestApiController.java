package egovframework.let.materials.request.create.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestSaveRequestVO;
import egovframework.let.materials.request.create.service.PurchaseRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매요청 등록/조회/수정/삭제 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/purchase-requests")
@Tag(name = "PurchaseRequestApiController", description = "구매요청 관리")
public class PurchaseRequestApiController {

    private final ResultVoHelper resultVoHelper;
    private final PurchaseRequestService purchaseRequestService;

    @Operation(summary = "구매요청 등록",
            description = "로그인 사용자를 요청자로 테넌트 범위의 품목과 사용용도를 검증한 뒤 구매요청을 등록한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PurchaseRequestApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "요청 값이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "품목을 찾을 수 없음")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createRequest(@RequestBody PurchaseRequestSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", purchaseRequestService.createRequest(user.getTenantId(), user.getId(), payload));
        values.put("message", "구매요청이 등록되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @Operation(summary = "구매요청 조회",
            description = "로그인 사용자의 테넌트 기준으로 구매요청 헤더와 상세를 조회한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PurchaseRequestApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "구매요청을 찾을 수 없음")
    })
    @GetMapping("/{purchaseRequestId}")
    public ResultVO getRequest(@PathVariable Long purchaseRequestId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", purchaseRequestService.getRequest(user.getTenantId(), purchaseRequestId));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @Operation(summary = "구매요청 수정",
            description = "요청 상태의 구매요청 헤더와 상세를 수정한다. 변경된 상세 행만 수정자/수정일시를 갱신한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PurchaseRequestApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "요청 값이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "구매요청 또는 품목을 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "확정되었거나 동시에 변경됨")
    })
    @PutMapping("/{purchaseRequestId}")
    public ResultVO updateRequest(@PathVariable Long purchaseRequestId,
            @RequestBody PurchaseRequestSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", purchaseRequestService.updateRequest(
                user.getTenantId(), user.getId(), purchaseRequestId, payload));
        values.put("message", "구매요청이 수정되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @Operation(summary = "구매요청 삭제",
            description = "요청 상태의 구매요청을 미사용 처리한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PurchaseRequestApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "구매요청을 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "확정된 구매요청")
    })
    @DeleteMapping("/{purchaseRequestId}")
    public ResultVO deleteRequest(@PathVariable Long purchaseRequestId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        purchaseRequestService.deleteRequest(user.getTenantId(), user.getId(), purchaseRequestId);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("message", "구매요청이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
