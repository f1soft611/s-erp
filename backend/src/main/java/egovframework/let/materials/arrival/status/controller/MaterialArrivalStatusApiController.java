package egovframework.let.materials.arrival.status.controller;

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
import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusSearchVO;
import egovframework.let.materials.arrival.status.domain.model.MaterialArrivalStatusVO;
import egovframework.let.materials.arrival.status.service.MaterialArrivalStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 가입고현황 조회 API 컨트롤러 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/materials/material-arrival-status")
@Tag(name = "MaterialArrivalStatusApiController", description = "가입고현황")
public class MaterialArrivalStatusApiController {

    private final ResultVoHelper resultVoHelper;
    private final MaterialArrivalStatusService materialArrivalStatusService;

    @Operation(summary = "가입고현황 조회",
            description = "로그인 사용자의 테넌트 기준으로 가입고 헤더와 상세를 품목 행 단위로 펼쳐 검색 조건에 맞게 조회한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "MaterialArrivalStatusApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "검색 조건이 유효하지 않음"),
            @ApiResponse(responseCode = "401", description = "인증된 사용자가 아님")
    })
    @GetMapping
    public ResultVO selectArrivalStatusList(@ModelAttribute MaterialArrivalStatusSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        List<MaterialArrivalStatusVO> resultList =
                materialArrivalStatusService.selectArrivalStatusList(user.getTenantId(), search);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("resultList", resultList);
        values.put("resultCnt", resultList.size());
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }
}
