package egovframework.let.materials.request.confirm.controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseRequestVO;
import egovframework.let.materials.request.confirm.service.PurchaseRequestConfirmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매요청 묶음 확정·발주대기 마감·확정 취소 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/purchase-request-confirms")
@Tag(name = "PurchaseRequestConfirmApiController", description = "구매요청 확정")
public class PurchaseRequestConfirmApiController {

    private static final String TAG = "PurchaseRequestConfirmApiController";

    private final ResultVoHelper resultVoHelper;
    private final PurchaseRequestConfirmService confirmService;

    @Operation(summary = "확정 대상 품목 목록", description = "요청·부분확정 상태 구매요청의 확정 안 된 품목 행을 검색어와 요청일 기간(fromDt, toDt, 선택)으로 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/candidates")
    public ResultVO listCandidates(@RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("resultList", confirmService.listCandidates(user.getTenantId(), keyword, fromDt, toDt), null);
    }

    @Operation(summary = "선택한 구매요청 품목 조회", description = "확정할 품목 행을 상세 행 ID로 조회한다. 확정됐거나 삭제된 요청의 행이 있으면 409",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "409", description = "이미 확정되었거나 삭제된 품목이 있음")
    })
    @GetMapping("/request-details")
    public ResultVO loadRequestDetails(@RequestParam List<Long> purchaseRequestDetailIds,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("resultList", confirmService.loadRequestDetails(user.getTenantId(), purchaseRequestDetailIds),
                null);
    }

    @Operation(summary = "기본 매입 단가 조회", description = "단가관리에서 품목·구매처·기준일에 유효한 매입 단가 1건을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/unit-price")
    public ResultVO findDefaultUnitPrice(@RequestParam Long materialId, @RequestParam Long supplierId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate baseDt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", confirmService.findDefaultUnitPrice(user.getTenantId(), materialId, supplierId, baseDt),
                null);
    }

    @Operation(summary = "구매요청확정 목록", description = "확정번호 목록을 조회한다. status: ACTIVE(기본), CANCELED, ALL. 확정일 기간(fromDt, toDt)은 선택",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listConfirms(@RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("resultList", confirmService.listConfirms(user.getTenantId(), keyword, status, fromDt, toDt), null);
    }

    @Operation(summary = "구매요청확정 조회", description = "확정번호 헤더와 묶인 구매요청 상세 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "구매요청확정을 찾을 수 없음")
    })
    @GetMapping("/{purchaseConfirmId}")
    public ResultVO getConfirm(@PathVariable Long purchaseConfirmId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", confirmService.getConfirm(user.getTenantId(), purchaseConfirmId), null);
    }

    @Operation(summary = "구매요청 품목 묶음 확정", description = "고른 품목 행을 확정하고 확정번호(MC)를 발급한다. 요청 상태는 다시 계산한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "확정 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 통화가 섞임"),
            @ApiResponse(responseCode = "409", description = "이미 확정된 요청이 있거나 상세가 변경됨")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createConfirm(@RequestBody PurchaseRequestConfirmRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", confirmService.createConfirm(user.getTenantId(), user.getId(), payload),
                "구매요청이 확정되었습니다.");
    }

    @Operation(summary = "발주대기 마감 저장", description = "확정에 묶인 상세 행의 발주대기 마감 여부를 저장한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "저장 성공"),
            @ApiResponse(responseCode = "400", description = "상세 행 또는 값이 유효하지 않음"),
            @ApiResponse(responseCode = "409", description = "취소된 확정")
    })
    @PutMapping("/{purchaseConfirmId}/order-close")
    public ResultVO saveOrderClose(@PathVariable Long purchaseConfirmId,
            @RequestBody PurchaseRequestOrderCloseRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item",
                confirmService.saveOrderClose(user.getTenantId(), user.getId(), purchaseConfirmId, payload),
                "발주대기 마감이 저장되었습니다.");
    }

    @Operation(summary = "구매요청확정 취소", description = "확정번호 전체를 취소한다. 그 확정의 품목만 미확정으로 돌아가고 확정은 사용 안 함으로 남는다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "확정 취소 성공"),
            @ApiResponse(responseCode = "409", description = "이미 취소된 확정")
    })
    @PostMapping("/{purchaseConfirmId}/cancel")
    public ResultVO cancelConfirm(@PathVariable Long purchaseConfirmId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", confirmService.cancelConfirm(user.getTenantId(), user.getId(), purchaseConfirmId),
                "구매요청 확정이 취소되었습니다.");
    }

    private ResultVO result(String key, Object value, String message) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put(key, value);
        if (message != null) {
            values.put("message", message);
        }
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
