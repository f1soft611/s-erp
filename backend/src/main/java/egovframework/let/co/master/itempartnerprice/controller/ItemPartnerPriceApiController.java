package egovframework.let.co.master.itempartnerprice.controller;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportPreflightRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSearchCondition;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/item-partner-prices")
@Tag(name = "ItemPartnerPriceApiController", description = "품목·거래처별 단가 관리")
public class ItemPartnerPriceApiController {
    private final ResultVoHelper resultVoHelper;
    private final ItemPartnerPriceService service;
    private final ItemPartnerPriceBatchService batchService;

    @GetMapping
    public ResultVO listPrices(@ModelAttribute ItemPartnerPriceSearchCondition condition,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return result("resultList", service.listPrices(tenant(user), condition));
    }

    @PostMapping("/validate-import")
    public ResultVO validateImport(@RequestBody ItemPartnerPriceImportPreflightRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        if (payload == null) throw new IllegalArgumentException("엑셀 검증 요청이 비어 있습니다.");
        return result("item", service.validateImport(tenant(user), payload.getRows()));
    }

    @PostMapping("/save-batch")
    public ResponseEntity<ResultVO> saveBatch(@RequestBody ItemPartnerPriceBatchSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return ResponseEntity.ok(result("item", batchService.saveBatch(tenant(user), actor(user), payload)));
    }

    private ResultVO result(String key, Object value) {
        Map<String, Object> map = new HashMap<String, Object>();
        map.put(key, value);
        return resultVoHelper.buildFromMap(map, ResponseCode.SUCCESS);
    }

    private Long tenant(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        return user.getTenantId();
    }

    private String actor(LoginVO user) {
        String value = user.getUniqId();
        if (value == null || value.trim().isEmpty() || value.trim().length() > 10) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보를 확인할 수 없습니다.");
        }
        return value.trim();
    }

    private void requireAdmin(LoginVO user) {
        tenant(user);
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResultVO> handleInputError(IllegalArgumentException ex) {
        Map<String, Object> error = new HashMap<String, Object>();
        error.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(resultVoHelper.buildFromMap(
                error, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ResultVO> handleMalformedRequest(HttpMessageNotReadableException ex) {
        return handleInputError(new IllegalArgumentException("단가 입력 형식과 값·범위를 확인해 주세요.", ex));
    }
}
