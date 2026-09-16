package egovframework.com.feed.controller;

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
import egovframework.com.feed.domain.model.FeedVO;
import egovframework.com.feed.service.FeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "FeedApiController", description = "공통 피드 API")
public class FeedApiController {

    private final ResultVoHelper resultVoHelper;
    private final FeedService feedService;

    public FeedApiController(ResultVoHelper resultVoHelper, FeedService feedService) {
        this.resultVoHelper = resultVoHelper;
        this.feedService = feedService;
    }

    @Operation(summary = "피드 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/feeds")
    public ResultVO listFeeds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        List<FeedVO> feeds = feedService.listFeeds(user.getTenantId(), user.getId(), page, size);
        resultMap.put("resultList", feeds);
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "피드 생성", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/feeds")
    public ResponseEntity<ResultVO> createFeed(
            @RequestBody FeedCreateRequest request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (request == null || !StringUtils.hasText(request.getEventType()) || !StringUtils.hasText(request.getTargetType()) || request.getTargetId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "피드 정보가 올바르지 않습니다.");
        }

        FeedVO created = feedService.createFeed(user.getTenantId(), request.getEventType(), request.getTargetType(), request.getTargetId(),
                user.getId(), user.getName(), request.getMessage(), request.getMetadataJson());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", created);
        resultMap.put("message", "피드가 생성되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    public static class FeedCreateRequest {
        private String eventType;
        private String targetType;
        private Long targetId;
        private String message;
        private String metadataJson;

        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public String getTargetType() { return targetType; }
        public void setTargetType(String targetType) { this.targetType = targetType; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getMetadataJson() { return metadataJson; }
        public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    }
}
