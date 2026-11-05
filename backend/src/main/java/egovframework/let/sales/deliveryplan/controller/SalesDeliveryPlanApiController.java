package egovframework.let.sales.deliveryplan.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
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
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanStatusSearchVO;
import egovframework.let.sales.deliveryplan.service.SalesDeliveryPlanService;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/delivery-plans")
public class SalesDeliveryPlanApiController {
    private final ResultVoHelper resultVoHelper;
    private final SalesDeliveryPlanService salesDeliveryPlanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO create(@RequestBody SalesDeliveryPlanRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryPlanService.create(user.getTenantId(), user.getId(), request));
        values.put("message", "납품계획이 성공적으로 등록되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/source-orders")
    public ResultVO listSourceOrders(@RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("items", salesDeliveryPlanService.listSourceOrders(user.getTenantId(), keyword));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/status")
    public ResultVO listStatus(@ModelAttribute SalesDeliveryPlanStatusSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("items", salesDeliveryPlanService.listStatus(
                user.getTenantId(), user.getId(), search));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/{salesDeliveryPlanId}")
    public ResultVO get(@PathVariable Long salesDeliveryPlanId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryPlanService.get(
                user.getTenantId(), user.getId(), salesDeliveryPlanId));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @PutMapping("/{salesDeliveryPlanId}")
    public ResultVO update(@PathVariable Long salesDeliveryPlanId,
            @RequestBody SalesDeliveryPlanRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryPlanService.update(
                user.getTenantId(), user.getId(), salesDeliveryPlanId, request));
        values.put("message", "납품계획이 성공적으로 수정되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() < 1L
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
