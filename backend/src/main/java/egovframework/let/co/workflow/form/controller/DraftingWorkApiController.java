package egovframework.let.co.workflow.form.controller;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/workflow/forms")
public class DraftingWorkApiController {

    private final ResultVoHelper resultVoHelper;
    private final DraftingWorkService draftingWorkService;

    @GetMapping
    public ResultVO listWorks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryItemId,
            @RequestParam(required = false) Long regTermId,
            @RequestParam(required = false) String useAt,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("resultList", draftingWorkService.listWorks(
                user.getTenantId(), keyword, categoryItemId, regTermId, useAt));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @GetMapping("/users")
    public ResultVO listUserOptions(
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<String, Object>();
        resultMap.put("resultList", draftingWorkService.listUserOptions(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping
    public ResponseEntity<ResultVO> createWork(
            @RequestBody DraftingWorkSaveRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        try {
            DraftingWorkVO created = draftingWorkService.createWork(
                    user.getTenantId(), resolveUserId(user), payload);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", created);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<String, Object>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    @PutMapping("/{draftingWorkCategoryId}")
    public ResponseEntity<ResultVO> updateWork(
            @PathVariable Long draftingWorkCategoryId,
            @RequestBody DraftingWorkSaveRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireTenantAdmin(user);
        try {
            DraftingWorkVO updated = draftingWorkService.updateWork(
                    user.getTenantId(), resolveUserId(user), draftingWorkCategoryId, payload);
            Map<String, Object> resultMap = new HashMap<String, Object>();
            resultMap.put("item", updated);
            return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<String, Object>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        } catch (NoSuchElementException ex) {
            Map<String, Object> errorMap = new HashMap<String, Object>();
            errorMap.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR));
        }
    }

    private void requireTenantAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private Long resolveUserId(LoginVO user) {
        if (user == null || !StringUtils.hasText(user.getUniqId())) {
            return null;
        }
        try {
            return Long.valueOf(user.getUniqId().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}