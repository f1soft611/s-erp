package egovframework.com.comment.controller;

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
import egovframework.com.comment.domain.model.CommentVO;
import egovframework.com.comment.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CommentApiController", description = "공통 댓글 API")
public class CommentApiController {

    private final ResultVoHelper resultVoHelper;
    private final CommentService commentService;

    public CommentApiController(ResultVoHelper resultVoHelper, CommentService commentService) {
        this.resultVoHelper = resultVoHelper;
        this.commentService = commentService;
    }

    @Operation(summary = "댓글 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/comments")
    public ResultVO listComments(
            @RequestParam String targetType,
            @RequestParam Long targetId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        List<CommentVO> comments = commentService.listComments(user.getTenantId(), targetType, targetId);
        resultMap.put("resultList", comments);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "댓글 등록", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/comments")
    public ResponseEntity<ResultVO> createComment(
            @RequestBody CommentCreateRequest request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (request == null || !StringUtils.hasText(request.getTargetType()) || request.getTargetId() == null || !StringUtils.hasText(request.getContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }

        CommentVO created = commentService.createComment(user.getTenantId(), request.getTargetType(), request.getTargetId(),
                request.getContent(), user.getId(), user.getName());
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

    public static class CommentCreateRequest {
        private String targetType;
        private Long targetId;
        private String content;
        private Long parentCommentId;

        public String getTargetType() { return targetType; }
        public void setTargetType(String targetType) { this.targetType = targetType; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Long getParentCommentId() { return parentCommentId; }
        public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    }
}
