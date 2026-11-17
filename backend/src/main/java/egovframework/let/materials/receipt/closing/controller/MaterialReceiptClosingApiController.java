package egovframework.let.materials.receipt.closing.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingReleaseRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSearchVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSupplierVO;
import egovframework.let.materials.receipt.closing.service.MaterialReceiptClosingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 매입마감 조회·마감·해제 API 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/purchase-closings")
@Tag(name = "MaterialReceiptClosingApiController", description = "매입마감처리")
public class MaterialReceiptClosingApiController {

    private static final String TAG = "MaterialReceiptClosingApiController";

    private final ResultVoHelper resultVoHelper;
    private final MaterialReceiptClosingService closingService;

    @Operation(summary = "구매처별 매입마감 요약",
            description = "입고일 기간 내 정상 입고 행과 선택한 마감월로 마감된 행을 구매처별로 집계한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "기간 또는 마감월이 유효하지 않음")
    })
    @GetMapping("/suppliers")
    public ResultVO listSuppliers(@ModelAttribute MaterialReceiptClosingSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        List<MaterialReceiptClosingSupplierVO> rows = closingService.listSuppliers(user.getTenantId(), search);
        return list(rows);
    }

    @Operation(summary = "매입마감 입고 행 목록",
            description = "조회구분 ALL(기간 내 전체)·OPEN(미마감)·CLOSED(선택 마감월로 마감된 행)로 입고 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listRows(@ModelAttribute MaterialReceiptClosingSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        List<MaterialReceiptClosingRowVO> rows = closingService.listRows(user.getTenantId(), search);
        return list(rows);
    }

    @Operation(summary = "매입마감", description = "선택한 미마감 입고 행을 마감월로 마감한다. 금액은 서버가 계산한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "마감 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않음"),
            @ApiResponse(responseCode = "409", description = "이미 마감됐거나 취소된 입고 행이 포함됨")
    })
    @PostMapping("/close")
    public ResultVO close(@RequestBody MaterialReceiptClosingRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        int count = closingService.close(user.getTenantId(), user.getId(), payload);
        return countResult(count, "매입마감이 처리되었습니다.");
    }

    @Operation(summary = "매입마감 해제", description = "선택한 마감 행의 마감 정보를 비운다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "해제 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않음"),
            @ApiResponse(responseCode = "409", description = "마감되지 않은 행이 포함됨")
    })
    @PostMapping("/release")
    public ResultVO release(@RequestBody MaterialReceiptClosingReleaseRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        int count = closingService.release(user.getTenantId(), user.getId(), payload);
        return countResult(count, "매입마감이 해제되었습니다.");
    }

    private ResultVO list(List<?> rows) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", rows);
        values.put("resultCnt", rows.size());
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private ResultVO countResult(int count, String message) {
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("count", count);
        values.put("message", message);
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
