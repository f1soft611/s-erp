package egovframework.let.sales.order.create.controller;

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
import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.service.SalesOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 수주 등록/조회/수정/삭제 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/orders")
@Tag(name = "SalesOrderApiController", description = "수주 관리")
public class SalesOrderApiController {

    private final ResultVoHelper resultVoHelper;
    private final SalesOrderService salesOrderService;

    /**
     * 로그인 사용자의 테넌트 기준으로 수주를 등록한다.
     *
     * @param payload 수주 등록 요청
     * @param user 인증된 로그인 사용자
     * @return 생성된 수주를 포함하는 공통 응답
     * @throws Exception 저장 중 발생한 예외
     */
    @Operation(summary = "수주 등록",
            description = "로그인 사용자의 테넌트 기준으로 거래처와 품목을 검증한 뒤 수주를 등록한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SalesOrderApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "수주 등록 성공"),
            @ApiResponse(responseCode = "400", description = "요청 값이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "거래처 또는 품목을 찾을 수 없음")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createOrder(
            @RequestBody SalesOrderCreateRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        SalesOrderVO saved = salesOrderService.createOrder(
                user.getTenantId(), user.getId(), payload);
        Map<String, Object> values = new HashMap<>();
        values.put("item", saved);
        values.put("message", "수주가 성공적으로 등록되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    /**
     * 로그인 사용자의 테넌트 기준으로 수주 헤더와 상세를 조회한다.
     *
     * @param salesOrderId 수주 ID
     * @param user 인증된 로그인 사용자
     * @return 수주 정보를 포함하는 공통 응답
     * @throws Exception 조회 중 발생한 예외
     */
    @Operation(summary = "수주 조회",
            description = "로그인 사용자의 테넌트 기준으로 수주 헤더와 상세(거래처/품목 코드와 명 포함)를 조회한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SalesOrderApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "수주를 찾을 수 없음")
    })
    @GetMapping("/{salesOrderId}")
    public ResultVO getOrder(
            @PathVariable Long salesOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<>();
        values.put("item", salesOrderService.getOrder(user.getTenantId(), salesOrderId));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    /**
     * 로그인 사용자의 테넌트 기준으로 수주를 수정한다.
     *
     * @param salesOrderId 수주 ID
     * @param payload 수주 수정 요청
     * @param user 인증된 로그인 사용자
     * @return 재조회한 수주를 포함하는 공통 응답
     * @throws Exception 저장 중 발생한 예외
     */
    @Operation(summary = "수주 수정",
            description = "로그인 사용자의 테넌트 기준으로 출하 전 수주등록 상태의 수주 헤더를 수정하고 상세를 재등록한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SalesOrderApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수주 수정 성공"),
            @ApiResponse(responseCode = "400", description = "요청 값이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "수주, 거래처 또는 품목을 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "출하가 진행되었거나 수정할 수 없는 상태")
    })
    @PutMapping("/{salesOrderId}")
    public ResultVO updateOrder(
            @PathVariable Long salesOrderId,
            @RequestBody SalesOrderCreateRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        SalesOrderVO updated = salesOrderService.updateOrder(
                user.getTenantId(), user.getId(), salesOrderId, payload);
        Map<String, Object> values = new HashMap<>();
        values.put("item", updated);
        values.put("message", "수주가 성공적으로 수정되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    /**
     * 로그인 사용자의 테넌트 기준으로 수주를 삭제(미사용 처리)한다.
     *
     * @param salesOrderId 수주 ID
     * @param user 인증된 로그인 사용자
     * @return 처리 메시지를 포함하는 공통 응답
     * @throws Exception 삭제 중 발생한 예외
     */
    @Operation(summary = "수주 삭제",
            description = "로그인 사용자의 테넌트 기준으로 출하 전 수주등록 상태의 수주를 미사용 처리한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SalesOrderApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수주 삭제 성공"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님"),
            @ApiResponse(responseCode = "404", description = "수주를 찾을 수 없음"),
            @ApiResponse(responseCode = "409", description = "출하가 진행되었거나 삭제할 수 없는 상태")
    })
    @DeleteMapping("/{salesOrderId}")
    public ResultVO deleteOrder(
            @PathVariable Long salesOrderId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        salesOrderService.deleteOrder(user.getTenantId(), user.getId(), salesOrderId);
        Map<String, Object> values = new HashMap<>();
        values.put("message", "수주가 성공적으로 삭제되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    /**
     * 필수 로그인 문맥이 없으면 인증 오류로 요청을 종료한다.
     *
     * @param user 인증된 로그인 사용자
     */
    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
