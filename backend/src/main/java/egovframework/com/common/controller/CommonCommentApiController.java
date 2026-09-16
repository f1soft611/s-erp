package egovframework.com.common.controller;

import java.util.HashMap;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.service.CommonCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CommonCommentApiController", description = "공통 댓글 API")
public class CommonCommentApiController {

    private final ResultVoHelper resultVoHelper;
    private final CommonCommentService commonCommentService;

    public CommonCommentApiController(ResultVoHelper resultVoHelper, CommonCommentService commonCommentService) {
        this.resultVoHelper = resultVoHelper;
        this.commonCommentService = commonCommentService;
    }

    @Operation(summary = "공통 댓글 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/common/comments")
    public ResultVO listComments(
            @RequestParam String ownerType,
            @RequestParam Long ownerId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        List<CommonCommentVO> comments = commonCommentService.listComments(user.getTenantId(), ownerType, ownerId);
        resultMap.put("resultList", comments);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 댓글 등록", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/common/comments")
    public ResponseEntity<ResultVO> createComment(
            @RequestBody CommonCommentCreateRequest request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (request == null || !StringUtils.hasText(request.getOwnerType()) || request.getOwnerId() == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }

        CommonCommentVO created = commonCommentService.createComment(user.getTenantId(), request.getOwnerType(), request.getOwnerId(),
                request.getContent(), user.getId(), user.getName(), request.getParentCommentId());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", created);
        resultMap.put("message", "댓글이 등록되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    public static class CommonCommentCreateRequest {
        private String ownerType;
        private Long ownerId;
        private String content;
        private Long parentCommentId;

        public String getOwnerType() { return ownerType; }
        public void setOwnerType(String ownerType) { this.ownerType = ownerType; }
        public Long getOwnerId() { return ownerId; }
        public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Long getParentCommentId() { return parentCommentId; }
        public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    }
}
