package egovframework.let.sales.delivery.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import egovframework.let.sales.delivery.domain.model.SalesDeliveryRequestVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryStatusSearchVO;
import egovframework.let.sales.delivery.service.SalesDeliveryService;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sales/deliveries")
public class SalesDeliveryApiController {
    private final ResultVoHelper resultVoHelper;
    private final SalesDeliveryService salesDeliveryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO createDelivery(@RequestBody SalesDeliveryRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryService.createDelivery(
                user.getTenantId(), user.getId(), payload));
        values.put("message", "납품이 성공적으로 등록되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/{salesDeliveryId}")
    public ResultVO getDelivery(@PathVariable Long salesDeliveryId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryService.getDelivery(
                user.getTenantId(), user.getId(), salesDeliveryId));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @PutMapping("/{salesDeliveryId}")
    public ResultVO updateDelivery(@PathVariable Long salesDeliveryId,
            @RequestBody SalesDeliveryRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("item", salesDeliveryService.updateDelivery(
                user.getTenantId(), user.getId(), salesDeliveryId, payload));
        values.put("message", "납품이 성공적으로 수정되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @DeleteMapping("/{salesDeliveryId}")
    public ResultVO deleteDelivery(@PathVariable Long salesDeliveryId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        salesDeliveryService.deleteDelivery(user.getTenantId(), user.getId(), salesDeliveryId);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("message", "납품이 성공적으로 삭제되었습니다.");
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/source-orders")
    public ResultVO listSourceOrders(@RequestParam(required = false) String keyword,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("items", salesDeliveryService.listSourceOrders(user.getTenantId(), keyword));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/status")
    public ResultVO listStatus(@ModelAttribute SalesDeliveryStatusSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("items", salesDeliveryService.listStatus(user.getTenantId(), user.getId(), search));
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() < 1L
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
