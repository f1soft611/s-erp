package egovframework.let.materials.arrival.create.controller;

import java.time.LocalDate;
import java.util.HashMap;
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
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalSaveRequestVO;
import egovframework.let.materials.arrival.create.service.MaterialArrivalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 가입고 후보 조회와 가입고 등록·수정·취소 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/material-arrivals")
@Tag(name = "MaterialArrivalApiController", description = "가입고 등록")
public class MaterialArrivalApiController {

    private static final String TAG = "MaterialArrivalApiController";

    private final ResultVoHelper resultVoHelper;
    private final MaterialArrivalService arrivalService;

    @Operation(summary = "가입고 대상 발주 품목 목록", description = "발주가 유효하고 입고대기 마감이 아니며 가입고 잔량이 남은 발주 품목 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/candidates")
    public ResultVO listCandidates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("resultList", arrivalService.listCandidates(user.getTenantId(), fromDt, toDt, keyword), null);
    }

    @Operation(summary = "가입고 조회", description = "가입고 헤더와 상세 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "가입고를 찾을 수 없음")
    })
    @GetMapping("/{materialArrivalId}")
    public ResultVO getArrival(@PathVariable Long materialArrivalId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", arrivalService.getArrival(user.getTenantId(), materialArrivalId), null);
    }

    @Operation(summary = "가입고 등록", description = "같은 구매처의 발주 품목 행을 불러와 가입고(MP)를 등록한다. 수량은 발주 잔량을 넘을 수 없고 단가는 필수다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "가입고 등록 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 잔량 초과"),
            @ApiResponse(responseCode = "409", description = "발주 품목이 변경되었거나 마감됨")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createArrival(@RequestBody MaterialArrivalSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", arrivalService.createArrival(user.getTenantId(), user.getId(), payload),
                "가입고가 등록되었습니다.");
    }

    @Operation(summary = "가입고 수정", description = "가입고일·부가세·비고와 기존 행의 값을 수정하고, 요청에 없는 행은 삭제한다. 모든 행을 뺄 수는 없다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 모든 행을 뺌, 잔량 초과"),
            @ApiResponse(responseCode = "404", description = "가입고를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 가입고이거나 동시에 변경됨")
    })
    @PutMapping("/{materialArrivalId}")
    public ResultVO updateArrival(@PathVariable Long materialArrivalId,
            @RequestBody MaterialArrivalSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", arrivalService.updateArrival(user.getTenantId(), user.getId(), materialArrivalId, payload),
                "가입고가 수정되었습니다.");
    }

    @Operation(summary = "가입고 취소", description = "가입고 전체를 취소한다(이력 보존). 취소하면 발주 잔량이 복원된다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "가입고 취소 성공"),
            @ApiResponse(responseCode = "404", description = "가입고를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 취소된 가입고")
    })
    @PostMapping("/{materialArrivalId}/cancel")
    public ResultVO cancelArrival(@PathVariable Long materialArrivalId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", arrivalService.cancelArrival(user.getTenantId(), user.getId(), materialArrivalId),
                "가입고가 취소되었습니다.");
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
