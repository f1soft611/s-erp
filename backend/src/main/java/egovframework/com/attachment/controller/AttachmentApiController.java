package egovframework.com.attachment.controller;

import java.util.HashMap;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.attachment.domain.model.AttachmentFileVO;
import egovframework.com.attachment.service.AttachmentService;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "AttachmentApiController", description = "공통 첨부파일 API")
public class AttachmentApiController {

    private final ResultVoHelper resultVoHelper;
    private final AttachmentService attachmentService;

    public AttachmentApiController(ResultVoHelper resultVoHelper, AttachmentService attachmentService) {
        this.resultVoHelper = resultVoHelper;
        this.attachmentService = attachmentService;
    }

    @Operation(summary = "공통 첨부 목록 조회", security = @SecurityRequirement(name = "Authorization"), tags = {"AttachmentApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @GetMapping("/attachments")
    public ResultVO listAttachments(
            @RequestParam String ownerType,
            @RequestParam Long ownerId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", attachmentService.listAttachments(user.getTenantId(), ownerType, ownerId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 첨부 업로드", security = @SecurityRequirement(name = "Authorization"), tags = {"AttachmentApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "업로드 성공"),
        @ApiResponse(responseCode = "400", description = "파일 비어있음")
    })
    @PostMapping("/attachments/upload")
    public ResponseEntity<ResultVO> uploadAttachment(
            @RequestParam String ownerType,
            @RequestParam Long ownerId,
            @RequestParam(required = false) String uploaderId,
            @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }

        AttachmentFileVO attachment = attachmentService.uploadAttachment(user.getTenantId(), ownerType, ownerId, file,
                uploaderId == null ? user.getId() : uploaderId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", attachment);
        resultMap.put("message", "첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공통 첨부 삭제", security = @SecurityRequirement(name = "Authorization"), tags = {"AttachmentApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "삭제 성공"),
        @ApiResponse(responseCode = "404", description = "첨부파일 없음")
    })
    @DeleteMapping("/attachments/{attachmentId}")
    public ResultVO deleteAttachment(
            @PathVariable Long attachmentId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        attachmentService.deleteAttachment(user.getTenantId(), attachmentId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공통 첨부 다운로드", security = @SecurityRequirement(name = "Authorization"), tags = {"AttachmentApiController"})
    @GetMapping("/attachments/{attachmentId}/download")
    public void downloadAttachment(
            @PathVariable Long attachmentId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        requireAuthenticated(user);
        attachmentService.downloadAttachment(user.getTenantId(), attachmentId, response);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}
