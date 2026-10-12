package egovframework.let.groupware.approval.controller;

import java.util.HashMap;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.service.DocumentApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/groupware/approvals")
@Tag(name = "DocumentApprovalApiController", description = "전자결재 임시저장 API")
public class DocumentApprovalApiController {

    private final ResultVoHelper resultVoHelper;
    private final DocumentApprovalService documentApprovalService;

    public DocumentApprovalApiController(ResultVoHelper resultVoHelper,
            DocumentApprovalService documentApprovalService) {
        this.resultVoHelper = resultVoHelper;
        this.documentApprovalService = documentApprovalService;
    }

    @Operation(summary = "전자결재 문서 임시저장", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/drafts")
    public ResponseEntity<ResultVO> createDraft(@RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalDraftVO saved = documentApprovalService.saveDraft(user, request);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", saved);
        resultMap.put("message", "문서가 임시저장되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시저장 문서 수정", security = @SecurityRequirement(name = "Authorization"))
    @PutMapping("/drafts/{electronicApprovalId}")
    public ResultVO updateDraft(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DocumentApprovalDraftVO saved = documentApprovalService.saveDraft(user, electronicApprovalId, request);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", saved);
        resultMap.put("message", "문서가 임시저장되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 결재신청", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/submit")
    public ResultVO submit(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalDraftSaveRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.submit(user, electronicApprovalId, request));
        resultMap.put("message", "문서가 결재신청되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 결재 처리", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/actions")
    public ResultVO processAction(@PathVariable Long electronicApprovalId,
            @RequestBody DocumentApprovalActionRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.processAction(user, electronicApprovalId, request));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 관련 전자결재 문서 목록", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents")
    public ResultVO listDocuments(@RequestParam(required = false, defaultValue = "ALL") String scope,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList",
                documentApprovalService.listDocuments(user, scope, documentType, electronicApprovalId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "내 전자결재 요약 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/summary")
    public ResultVO getSummary(@AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.getSummary(user));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 문서 상세 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/documents/{electronicApprovalId}")
    public ResultVO getDetail(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", documentApprovalService.getDetail(user, electronicApprovalId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 목록 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/attachments")
    public ResultVO listAttachments(@PathVariable Long electronicApprovalId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", documentApprovalService.listAttachments(user, electronicApprovalId));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/{electronicApprovalId}/attachments")
    public ResponseEntity<ResultVO> uploadAttachment(@PathVariable Long electronicApprovalId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        CommonFileVO uploaded = documentApprovalService.uploadAttachment(user, electronicApprovalId, file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시저장 첨부 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/{electronicApprovalId}/attachments/{fileId}")
    public ResultVO deleteAttachment(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteAttachment(user, electronicApprovalId, fileId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 임시저장 첨부 다운로드", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/attachments/{fileId}/download")
    public void downloadAttachment(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }
        documentApprovalService.downloadAttachment(user, electronicApprovalId, fileId, response);
    }

    @Operation(summary = "전자결재 본문 이미지 임시 업로드", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/embedded-images/temp")
    public ResponseEntity<ResultVO> uploadTemporaryEmbeddedImage(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        EmbeddedImageUploadVO uploaded = documentApprovalService.uploadTemporaryEmbeddedImage(user, file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", uploaded);
        resultMap.put("message", "본문 이미지가 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "전자결재 임시 본문 이미지 삭제", security = @SecurityRequirement(name = "Authorization"))
    @DeleteMapping("/embedded-images/temp/{uploadToken}")
    public ResultVO deleteTemporaryEmbeddedImage(@PathVariable String uploadToken,
            @RequestParam String fileName, @AuthenticationPrincipal LoginVO user) throws Exception {
        documentApprovalService.deleteTemporaryEmbeddedImage(user, uploadToken, fileName);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "임시 본문 이미지가 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "전자결재 본문 이미지 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/{electronicApprovalId}/embedded-images/{fileId}")
    public void streamEmbeddedImage(@PathVariable Long electronicApprovalId, @PathVariable Long fileId,
            @AuthenticationPrincipal LoginVO user, HttpServletResponse response) throws Exception {
        documentApprovalService.streamEmbeddedImage(user, electronicApprovalId, fileId, response);
    }
}
