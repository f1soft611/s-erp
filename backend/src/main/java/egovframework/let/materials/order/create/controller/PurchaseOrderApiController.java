package egovframework.let.materials.order.create.controller;

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
import egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 발주 후보 조회와 발주 등록 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/purchase-orders")
@Tag(name = "PurchaseOrderApiController", description = "발주 등록")
public class PurchaseOrderApiController {

    private static final String TAG = "PurchaseOrderApiController";

    private final ResultVoHelper resultVoHelper;
    private final PurchaseOrderService orderService;

    @Operation(summary = "발주 대상 확정 품목 목록", description = "확정이 유효하고 발주대기 마감이 아니며 잔량이 남은 확정 품목 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/candidates")
    public ResultVO listCandidates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDt,
            @RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("resultList", orderService.listCandidates(user.getTenantId(), fromDt, toDt, keyword), null);
    }

    @Operation(summary = "직접 발주 품목 기본값", description = "품목의 계정과 검사대상 기본값을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/material-default")
    public ResultVO getMaterialDefault(@RequestParam Long materialId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.getMaterialDefault(user.getTenantId(), materialId), null);
    }

    @Operation(summary = "발주 조회", description = "발주 헤더와 상세 행을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음")
    })
    @GetMapping("/{purchaseOrderId}")
    public ResultVO getOrder(@PathVariable Long purchaseOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.getOrder(user.getTenantId(), purchaseOrderId), null);
    }

    @Operation(summary = "발주 등록", description = "확정 품목을 불러오거나 품목을 직접 골라 발주서(PO)를 등록한다. 직접 발주는 구매요청·확정을 자동 생성한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "발주 등록 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않음"),
            @ApiResponse(responseCode = "409", description = "확정 품목이 변경되었거나 마감됨")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createOrder(@RequestBody PurchaseOrderSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.createOrder(user.getTenantId(), user.getId(), payload),
                "발주가 등록되었습니다.");
    }

    @Operation(summary = "발주 수정", description = "발주일·부가세·비고와 기존 행의 값을 수정하고, 요청에 없는 행은 삭제한다. 모든 행을 뺄 수는 없다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수정 성공"),
            @ApiResponse(responseCode = "400", description = "입력값이 유효하지 않거나 모든 행을 뺌"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 발주이거나 동시에 변경됨")
    })
    @PutMapping("/{purchaseOrderId}")
    public ResultVO updateOrder(@PathVariable Long purchaseOrderId, @RequestBody PurchaseOrderSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.updateOrder(user.getTenantId(), user.getId(), purchaseOrderId, payload),
                "발주가 수정되었습니다.");
    }

    @Operation(summary = "발주서 출력 데이터 조회", description = "발주서 출력에 쓰는 회사·구매처·발주자 정보와 품목을 조회한다. 발주 저장 시 복사한 스냅샷을 우선하고, 없는 기존 발주는 현재 정보를 쓴다. 취소된 발주는 출력할 수 없다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 발주")
    })
    @GetMapping("/{purchaseOrderId}/print")
    public ResultVO getPrintData(@PathVariable Long purchaseOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.getPrintData(user.getTenantId(), purchaseOrderId), null);
    }

    @Operation(summary = "발주서 출력 기록", description = "인쇄 버튼을 눌렀을 때 출력했다고 기록한다(출력 여부, 출력 일시, 출력자)",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "기록 성공"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 발주")
    })
    @PostMapping("/{purchaseOrderId}/print-mark")
    public ResultVO markPrinted(@PathVariable Long purchaseOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.markPrinted(user.getTenantId(), user.getId(), purchaseOrderId),
                "발주서 출력이 기록되었습니다.");
    }

    @Operation(summary = "입고대기 마감 저장", description = "발주 행의 입고대기 마감 값만 저장한다. 수량·단가 등 다른 값은 바꾸지 않는다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "저장 성공"),
            @ApiResponse(responseCode = "400", description = "상세 행 또는 값이 유효하지 않음"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "취소된 발주")
    })
    @PutMapping("/{purchaseOrderId}/receipt-close")
    public ResultVO saveReceiptClose(@PathVariable Long purchaseOrderId,
            @RequestBody PurchaseOrderReceiptCloseRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.saveReceiptClose(user.getTenantId(), user.getId(), purchaseOrderId, payload),
                "입고대기 마감이 저장되었습니다.");
    }

    @Operation(summary = "발주 취소", description = "발주서 전체를 취소한다. 직접 발주는 자동 생성된 확정·구매요청도 함께 정리한다",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "발주 취소 성공"),
            @ApiResponse(responseCode = "404", description = "발주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "이미 취소된 발주")
    })
    @PostMapping("/{purchaseOrderId}/cancel")
    public ResultVO cancelOrder(@PathVariable Long purchaseOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return result("item", orderService.cancelOrder(user.getTenantId(), user.getId(), purchaseOrderId),
                "발주가 취소되었습니다.");
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
