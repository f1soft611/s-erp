package egovframework.let.co.master.material.controller;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.material.domain.model.MaterialInfoSaveRequestVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSearchCondition;
import egovframework.let.co.master.material.domain.model.MaterialInfoBatchSaveRequestVO;
import egovframework.let.co.master.material.service.MaterialInfoService;
import egovframework.let.co.master.material.service.MaterialInfoBatchService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/materials")
@Tag(name = "MaterialInfoApiController", description = "품목 관리")
public class MaterialInfoApiController {
    private final ResultVoHelper resultVoHelper;
    private final MaterialInfoBatchService batchService;
    private final MaterialInfoService service;

    @GetMapping
    public ResultVO listMaterials(@ModelAttribute MaterialInfoSearchCondition condition,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return result("resultList", service.listMaterials(tenant(user), condition));
    }

    @GetMapping("/options")
    public ResultVO listOptions(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return result("resultList", service.listOptions(tenant(user)));
    }

    @PostMapping
    public ResponseEntity<ResultVO> createMaterial(@RequestBody MaterialInfoSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(result("item",
                service.createMaterial(tenant(user), actor(user), payload)));
    }

    @PutMapping("/{materialId}")
    public ResponseEntity<ResultVO> updateMaterial(@PathVariable Long materialId,
            @RequestBody MaterialInfoSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return ResponseEntity.ok(result("item", service.updateMaterial(tenant(user), actor(user), materialId, payload)));
    }

    @PostMapping("/save-batch")
    public ResponseEntity<ResultVO> saveBatch(@RequestBody MaterialInfoBatchSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        return ResponseEntity.ok(result("item", batchService.saveBatch(tenant(user), actor(user), payload)));
    }

    private ResultVO result(String key, Object value) {
        Map<String, Object> map = new HashMap<>();
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
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(resultVoHelper.buildFromMap(error, ResponseCode.INPUT_CHECK_ERROR, ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ResultVO> handleMalformedRequest(HttpMessageNotReadableException ex) {
        return handleInputError(new IllegalArgumentException("품목 입력 형식과 정수 필드의 값·범위를 확인해 주세요.", ex));
    }
}
