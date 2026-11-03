package egovframework.let.groupware.notification.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionRequestVO;
import egovframework.let.groupware.notification.domain.model.PushSubscriptionStatusVO;
import egovframework.let.groupware.notification.service.PushSubscriptionService;

@RestController
@RequestMapping("/api/v1/groupware/push-subscriptions")
public class PushSubscriptionApiController {

    private final ResultVoHelper resultVoHelper;
    private final PushSubscriptionService pushSubscriptionService;

    public PushSubscriptionApiController(ResultVoHelper resultVoHelper,
            PushSubscriptionService pushSubscriptionService) {
        this.resultVoHelper = resultVoHelper;
        this.pushSubscriptionService = pushSubscriptionService;
    }

    @GetMapping("/status")
    public ResultVO status(@RequestParam(required = false) String endpointHash,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        PushSubscriptionStatusVO status = pushSubscriptionService.getStatus(user, endpointHash);
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("enabled", status.isEnabled());
        result.put("activeDeviceCount", status.getActiveDeviceCount());
        result.put("currentDevice", status.getCurrentDevice());
        result.put("vapidPublicKey", status.getVapidPublicKey());
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PostMapping
    public ResultVO register(@RequestBody PushSubscriptionRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Long subscriptionId = pushSubscriptionService.register(user, request);
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("registered", true);
        result.put("subscriptionId", subscriptionId);
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @DeleteMapping("/{subscriptionId}")
    public ResultVO unsubscribe(@PathVariable Long subscriptionId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        pushSubscriptionService.unsubscribe(user, subscriptionId);
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("unsubscribed", true);
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }
}
