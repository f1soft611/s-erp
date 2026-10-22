package egovframework.let.co.master.customer.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveResultVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSearchCondition;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.service.CustomerInfoService;
import egovframework.let.co.master.customer.service.CustomerInfoBatchService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/customers")
@Tag(name = "CustomerInfoApiController", description = "거래처 관리")
public class CustomerInfoApiController {

    private final ResultVoHelper resultVoHelper;
    private final CustomerInfoBatchService customerInfoBatchService;
    private final CustomerInfoService customerInfoService;

    @PostMapping("/save-batch")
    public ResponseEntity<ResultVO> saveBatch(
            @RequestBody CustomerInfoBatchSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            CustomerInfoBatchSaveResultVO result = customerInfoBatchService.saveBatch(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", result);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @GetMapping
    public ResultVO listCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String presidentName,
            @RequestParam(required = false) String businessNo,
            @RequestParam(required = false) String juridNo,
            @RequestParam(required = false) String businessStatus1,
            @RequestParam(required = false) String businessItem1,
            @RequestParam(required = false) String useAt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        CustomerInfoSearchCondition condition = new CustomerInfoSearchCondition();
        condition.setKeyword(keyword);
        condition.setPresidentName(presidentName);
        condition.setBusinessNo(businessNo);
        condition.setJuridNo(juridNo);
        condition.setBusinessStatus1(businessStatus1);
        condition.setBusinessItem1(businessItem1);
        condition.setUseAt(useAt);
        Map<String, Object> resultMap = new HashMap<>();
        if (hasSearchValue(keyword) || hasSearchValue(presidentName) || hasSearchValue(businessNo)
                || hasSearchValue(juridNo) || hasSearchValue(businessStatus1)
                || hasSearchValue(businessItem1) || hasSearchValue(useAt)) {
            resultMap.put("resultList", customerInfoService.listCustomers(user.getTenantId(), condition));
        } else {
            resultMap.put("resultList", customerInfoService.listCustomers(user.getTenantId()));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private boolean hasSearchValue(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @PostMapping
    public ResponseEntity<ResultVO> createCustomer(
            @RequestBody CustomerInfoSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            CustomerInfoVO created = customerInfoService.createCustomer(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", created);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping("/{customerId}")
    public ResponseEntity<ResultVO> updateCustomer(
            @PathVariable Long customerId,
            @RequestBody CustomerInfoSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            CustomerInfoVO updated = customerInfoService.updateCustomer(
                    user.getTenantId(), resolveUserId(user), customerId, payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", updated);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> handleInputError(IllegalArgumentException ex) {
        return badRequest(ex.getMessage());
    }

    private ResponseEntity<ResultVO> badRequest(String message) {
        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(resultVoHelper.buildFromMap(
                        errorMap, ResponseCode.INPUT_CHECK_ERROR, message));
    }

    private Long resolveUserId(LoginVO user) {
        if (user == null || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
    }
}
