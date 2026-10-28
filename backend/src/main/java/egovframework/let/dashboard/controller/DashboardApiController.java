package egovframework.let.dashboard.controller;

import java.util.Collections;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "권한별 종합현황 조회")
public class DashboardApiController {
    private final DashboardService dashboardService;
    private final ResultVoHelper resultVoHelper;

    @GetMapping("/overview")
    @Operation(summary = "내 업무 및 최근 공지", security = @SecurityRequirement(name = "Authorization"))
    public ResultVO overview(@AuthenticationPrincipal LoginVO user) throws Exception {
        return resultVoHelper.buildFromMap(
                Collections.singletonMap("item", dashboardService.overview(user)), ResponseCode.SUCCESS);
    }

    @GetMapping("/sales")
    @Operation(summary = "수주 월별 집계와 납기 예정", security = @SecurityRequirement(name = "Authorization"))
    public ResultVO sales(@AuthenticationPrincipal LoginVO user,
            @RequestParam(required = false) String month) throws Exception {
        return resultVoHelper.buildFromMap(
                Collections.singletonMap("item", dashboardService.sales(user, month)), ResponseCode.SUCCESS);
    }
}
