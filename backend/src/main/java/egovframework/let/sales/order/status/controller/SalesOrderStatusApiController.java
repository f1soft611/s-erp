package egovframework.let.sales.order.status.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusSearchVO;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;
import egovframework.let.sales.order.status.service.SalesOrderStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 수주현황 조회 API 요청을 처리하는 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.10.27
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/order-status")
@Tag(name = "SalesOrderStatusApiController", description = "수주현황")
public class SalesOrderStatusApiController {

    private final ResultVoHelper resultVoHelper;
    private final SalesOrderStatusService salesOrderStatusService;

    /**
     * 로그인 사용자의 테넌트 기준으로 수주 헤더와 상세를 결합한 수주현황을 조회한다.
     *
     * @param search 검색 조건
     * @param user 인증된 로그인 사용자
     * @return 수주현황 목록과 건수를 포함하는 공통 응답
     * @throws Exception 조회 중 발생한 예외
     */
    @Operation(summary = "수주현황 조회",
            description = "로그인 사용자의 테넌트 기준으로 수주 헤더와 상세를 한 행으로 결합해 검색 조건에 맞게 조회한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "SalesOrderStatusApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "검색 조건이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping
    public ResultVO selectOrderStatusList(
            @ModelAttribute SalesOrderStatusSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        List<SalesOrderStatusVO> resultList =
                salesOrderStatusService.selectOrderStatusList(user.getTenantId(), search);
        Map<String, Object> values = new HashMap<>();
        values.put("resultList", resultList);
        values.put("resultCnt", resultList.size());
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
