package egovframework.let.quality.inspect.create.controller;

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
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionCandidateVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionSaveRequestVO;
import egovframework.let.quality.inspect.create.service.QualityInspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 자재 수입검사 후보 조회와 검사 등록·조회·수정·취소 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/quality/quality-inspections")
@Tag(name = "QualityInspectionApiController", description = "자재 수입검사 등록")
public class QualityInspectionApiController {

    private static final String TAG = "QualityInspectionApiController";

    private final ResultVoHelper resultVoHelper;
    private final QualityInspectionService inspectionService;

    @Operation(summary = "검사 대기 가입고 품목 목록",
            description = "정상 가입고의 검사 대상 품목 중 검사 대기량이 남은 행을 조회한다. total은 조회 조건과 무관한 전체 검사 대기 건수다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/candidates")
    public ResultVO listCandidates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @RequestParam(required = false) String supplierKeyword,
            @RequestParam(required = false) String materialKeyword,
            @RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        List<QualityInspectionCandidateVO> rows = inspectionService.listCandidates(user.getTenantId(), fromDt, toDt,
                supplierKeyword, materialKeyword, keyword);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", rows);
        values.put("resultCnt", rows.size());
        values.put("total", inspectionService.countWaiting(user.getTenantId()));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @Operation(summary = "검사 조회", description = "검사 헤더와 상세 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "검사를 찾을 수 없음")
    })
    @GetMapping("/{qualityInspectionId}")
    public ResultVO getInspection(@PathVariable Long qualityInspectionId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", inspectionService.getInspection(user.getTenantId(), qualityInspectionId), null);
    }

    @Operation(summary = "검사 등록", description = "검사 대기 가입고 행을 여러 개 불러와 한 검사번호(QI)로 합격·불합격 수량을 등록한다. 검사량은 검사 대기량을 넘을 수 없다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "등록 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않음"),
            @ApiResponse(responseCode = "409", description = "검사 대기량 초과 또는 가입고 품목 변경됨")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createInspection(@RequestBody QualityInspectionSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", inspectionService.createInspection(user.getTenantId(), user.getId(), payload),
                "검사가 등록되었습니다.");
    }

    @Operation(summary = "검사 수정", description = "검사일·검사자·비고와 기존 행의 수량·비고를 수정하고, 요청에 없는 행은 삭제한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 모든 행을 뺌"),
            @ApiResponse(responseCode = "404", description = "검사를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 검사이거나 검사 대기량 초과 또는 동시 변경")
    })
    @PutMapping("/{qualityInspectionId}")
    public ResultVO updateInspection(@PathVariable Long qualityInspectionId,
            @RequestBody QualityInspectionSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item",
                inspectionService.updateInspection(user.getTenantId(), user.getId(), qualityInspectionId, payload),
                "검사가 수정되었습니다.");
    }

    @Operation(summary = "검사 취소", description = "검사 전체를 취소한다(이력 보존). 취소하면 가입고 행의 잠금과 검사 대기량이 복구된다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "검사 취소 성공"),
            @ApiResponse(responseCode = "404", description = "검사를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 취소된 검사")
    })
    @PostMapping("/{qualityInspectionId}/cancel")
    public ResultVO cancelInspection(@PathVariable Long qualityInspectionId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", inspectionService.cancelInspection(user.getTenantId(), user.getId(), qualityInspectionId),
                "검사가 취소되었습니다.");
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
