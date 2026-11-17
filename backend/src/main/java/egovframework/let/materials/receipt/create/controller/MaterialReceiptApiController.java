package egovframework.let.materials.receipt.create.controller;

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
import egovframework.let.materials.receipt.create.domain.model.MaterialReceiptCandidateVO;
import egovframework.let.materials.receipt.create.domain.model.MaterialReceiptSaveRequestVO;
import egovframework.let.materials.receipt.create.service.MaterialReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 입고 후보 조회, 수입검사 합격분 입고 등록, 입고 조회·수정·취소 API 요청을 처리하는 컨트롤러 클래스.
 * 무검사 입고는 가입고 저장 시 자동 생성된다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/material-receipts")
@Tag(name = "MaterialReceiptApiController", description = "입고 등록")
public class MaterialReceiptApiController {

    private static final String TAG = "MaterialReceiptApiController";

    private final ResultVoHelper resultVoHelper;
    private final MaterialReceiptService receiptService;

    @Operation(summary = "입고 대상 수입검사 합격분 목록",
            description = "정상 수입검사 행 중 입고 가능량(합격량 − 유효 입고 합)이 남은 행을 조회한다. total은 조회 조건과 무관한 전체 입고 가능 건수다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/candidates")
    public ResultVO listCandidates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        List<MaterialReceiptCandidateVO> rows =
                receiptService.listCandidates(user.getTenantId(), fromDt, toDt, keyword);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", rows);
        values.put("resultCnt", rows.size());
        values.put("total", receiptService.countCandidates(user.getTenantId()));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @Operation(summary = "입고 등록", description = "수입검사 합격분을 불러와 입고(MI)를 등록한다. 한 입고는 구매처 1곳·통화 1종이고 입고수량은 입고 가능량을 넘을 수 없다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 구매처·통화가 섞임"),
            @ApiResponse(responseCode = "409", description = "입고 가능량 초과 또는 수입검사 품목 변경됨")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createReceipt(@RequestBody MaterialReceiptSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", receiptService.createReceipt(user.getTenantId(), user.getId(), payload),
                "입고가 등록되었습니다.");
    }

    @Operation(summary = "입고 조회", description = "입고 헤더와 상세 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "입고를 찾을 수 없음")
    })
    @GetMapping("/{materialReceiptId}")
    public ResultVO getReceipt(@PathVariable Long materialReceiptId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", receiptService.getReceipt(user.getTenantId(), materialReceiptId), null);
    }

    @Operation(summary = "입고 수정", description = "입고일·부가세·비고와 기존 행의 값을 수정하고, 요청에 없는 행은 삭제한다. 무검사 행은 가입고에도 반영한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 모든 행을 뺌"),
            @ApiResponse(responseCode = "404", description = "입고를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 입고이거나 동시에 변경됨")
    })
    @PutMapping("/{materialReceiptId}")
    public ResultVO updateReceipt(@PathVariable Long materialReceiptId,
            @RequestBody MaterialReceiptSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", receiptService.updateReceipt(user.getTenantId(), user.getId(), materialReceiptId, payload),
                "입고가 수정되었습니다.");
    }

    @Operation(summary = "입고 취소", description = "입고 전체를 취소한다(이력 보존). 무검사 행의 가입고 행은 함께 정리된다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "입고 취소 성공"),
            @ApiResponse(responseCode = "404", description = "입고를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 취소된 입고")
    })
    @PostMapping("/{materialReceiptId}/cancel")
    public ResultVO cancelReceipt(@PathVariable Long materialReceiptId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", receiptService.cancelReceipt(user.getTenantId(), user.getId(), materialReceiptId),
                "입고가 취소되었습니다.");
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
