package egovframework.let.co.master.warehouse.controller;

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
import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveResultVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseSearchCondition;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.service.WarehouseService;
import egovframework.let.co.master.warehouse.service.WarehouseBatchService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/warehouses")
@Tag(name = "WarehouseApiController", description = "창고 관리")
public class WarehouseApiController {

    private final ResultVoHelper resultVoHelper;
    private final WarehouseBatchService warehouseBatchService;
    private final WarehouseService warehouseService;

    @PostMapping("/save-batch")
    public ResponseEntity<ResultVO> saveBatch(
            @RequestBody WarehouseBatchSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            WarehouseBatchSaveResultVO result = warehouseBatchService.saveBatch(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", result);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @GetMapping
    public ResultVO listWarehouses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String warehouseType,
            @RequestParam(required = false) String disuseAt,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        WarehouseSearchCondition condition = new WarehouseSearchCondition();
        condition.setKeyword(keyword);
        condition.setWarehouseType(warehouseType);
        condition.setDisuseAt(disuseAt);
        Map<String, Object> resultMap = new HashMap<>();
        if (hasSearchValue(keyword) || hasSearchValue(warehouseType) || hasSearchValue(disuseAt)) {
            resultMap.put("resultList", warehouseService.listWarehouses(user.getTenantId(), condition));
        } else {
            resultMap.put("resultList", warehouseService.listWarehouses(user.getTenantId()));
        }
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/users")
    public ResultVO listUserOptions(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", warehouseService.listUserOptions(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private boolean hasSearchValue(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @PostMapping
    public ResponseEntity<ResultVO> createWarehouse(
            @RequestBody WarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            WarehouseVO created = warehouseService.createWarehouse(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", created);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping("/{warehouseId}")
    public ResponseEntity<ResultVO> updateWarehouse(
            @PathVariable Long warehouseId,
            @RequestBody WarehouseSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            WarehouseVO updated = warehouseService.updateWarehouse(
                    user.getTenantId(), resolveUserId(user), warehouseId, payload);
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
