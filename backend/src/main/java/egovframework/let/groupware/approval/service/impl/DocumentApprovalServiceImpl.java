package egovframework.let.groupware.approval.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.jsoup.Jsoup;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO.ApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.service.DocumentApprovalService;

@Service("documentApprovalService")
public class DocumentApprovalServiceImpl implements DocumentApprovalService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String SYSTEM_COMMENT_TYPE = "SYSTEM";
    private static final String DRAFT_SAVED_EVENT = "DRAFT_SAVED";
    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> PARTICIPANT_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("APPROVAL", "AGREEMENT", "REFERENCE")));

    private final DocumentApprovalDAO documentApprovalDAO;
    private final CommonCommentDAO commonCommentDAO;
    private final CommonFileService commonFileService;
    private final RichTextDocumentSanitizer documentSanitizer;

    public DocumentApprovalServiceImpl(DocumentApprovalDAO documentApprovalDAO, CommonCommentDAO commonCommentDAO,
            CommonFileService commonFileService, RichTextDocumentSanitizer documentSanitizer) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonCommentDAO = commonCommentDAO;
        this.commonFileService = commonFileService;
        this.documentSanitizer = documentSanitizer;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO saveDraft(LoginVO user, DocumentApprovalDraftSaveRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        validateDraftRequest(request);
        Map<String, Object> actor = actorParams(user);
        validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        Map<String, DocumentApprovalParticipantVO> participants = validateParticipants(request.getApprovalLines(), user);

        Map<String, Object> documentParams = documentParams(user, request, actor);
        Long approvalId = documentApprovalDAO.insertDocumentApprovalMain(documentParams);
        if (approvalId == null) {
            throw new IllegalStateException("전자결재 문서 ID를 확인할 수 없습니다.");
        }

        replaceApprovalLines(user, approvalId, request.getApprovalLines(), participants);
        insertDraftSavedMessage(user, approvalId);
        return draftResponse(approvalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO saveDraft(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        validateDraftRequest(request);
        if (electronicApprovalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 없습니다.");
        }
        Map<String, Object> actor = actorParams(user);
        actor.put("electronicApprovalId", electronicApprovalId);
        String drafterId = documentApprovalDAO.selectDraftDrafterId(actor);
        if (drafterId == null || !drafterId.equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }

        validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        Map<String, DocumentApprovalParticipantVO> participants = validateParticipants(request.getApprovalLines(), user);
        Map<String, Object> documentParams = documentParams(user, request, actor);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }

        replaceApprovalLines(user, electronicApprovalId, request.getApprovalLines(), participants);
        insertDraftSavedMessage(user, electronicApprovalId);
        return draftResponse(electronicApprovalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommonFileVO> listAttachments(LoginVO user, Long electronicApprovalId) throws Exception {
        requireDraftOwner(user, electronicApprovalId);
        return commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonFileVO uploadAttachment(LoginVO user, Long electronicApprovalId, MultipartFile file) throws Exception {
        requireDraftOwner(user, electronicApprovalId);
        return commonFileService.uploadFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, file, user.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAttachment(LoginVO user, Long electronicApprovalId, Long fileId) throws Exception {
        requireDraftOwner(user, electronicApprovalId);
        List<CommonFileVO> files = commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId);
        boolean ownedFileExists = files != null && files.stream()
                .anyMatch(file -> fileId != null && fileId.equals(file.getFileId()));
        if (!ownedFileExists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }
        commonFileService.deleteFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId);
    }

    @Override
    @Transactional(readOnly = true)
    public void downloadAttachment(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception {
        requireDraftOwner(user, electronicApprovalId);
        commonFileService.downloadFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId, response);
    }

    private void validateAuthenticatedUser(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())
                || !StringUtils.hasText(user.getUniqId()) || !StringUtils.hasText(user.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateDraftRequest(DocumentApprovalDraftSaveRequestVO request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시저장 문서 정보가 올바르지 않습니다.");
        }
        String title = request.getTitle() == null ? "" : request.getTitle().trim();
        if (!StringUtils.hasText(request.getDocumentType())
                || !DOCUMENT_TYPES.contains(request.getDocumentType().trim())
                || !StringUtils.hasText(title)
                || title.codePointCount(0, title.length()) > 300
                || request.getContentsJson() == null || !request.getContentsJson().isObject()
                || !"doc".equals(request.getContentsJson().path("type").asText())
                || request.getApprovalLines() == null || request.getApprovalLines().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시저장 문서 정보가 올바르지 않습니다.");
        }
    }

    private void validateCategory(Long categoryId, Long tenantId) throws Exception {
        if (categoryId == null) {
            return;
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("draftingWorkCategoryId", categoryId);
        if (!Boolean.TRUE.equals(documentApprovalDAO.selectActiveDraftingCategory(params))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용할 수 없는 기안 업무 구분입니다.");
        }
    }

    private Map<String, DocumentApprovalParticipantVO> validateParticipants(List<ApprovalLineVO> approvalLines,
            LoginVO user) throws Exception {
        Set<String> userIds = new HashSet<>();
        Set<String> positions = new HashSet<>();
        boolean drafterIsFirstApprover = false;
        boolean hasApprovalAction = false;
        List<String> participantUserIds = new ArrayList<>();

        for (ApprovalLineVO line : approvalLines) {
            if (line == null || line.getStageOrder() == null || line.getStageOrder() < 1
                    || line.getParticipantOrder() == null || line.getParticipantOrder() < 1
                    || !StringUtils.hasText(line.getParticipantType())
                    || !PARTICIPANT_TYPES.contains(line.getParticipantType())
                    || !StringUtils.hasText(line.getParticipantUserId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 정보가 올바르지 않습니다.");
            }
            String userId = line.getParticipantUserId().trim();
            if (userId.codePointCount(0, userId.length()) > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 참여자 ID가 올바르지 않습니다.");
            }
            String position = line.getStageOrder() + ":" + line.getParticipantOrder();
            if (!userIds.add(userId) || !positions.add(position)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 참여자는 중복될 수 없습니다.");
            }
            participantUserIds.add(userId);
            if ("APPROVAL".equals(line.getParticipantType())) {
                hasApprovalAction = true;
                drafterIsFirstApprover |= line.getStageOrder() == 1 && userId.equals(user.getUniqId());
            }
        }

        if (!hasApprovalAction || !drafterIsFirstApprover) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선에 기안자의 1단계 결재가 필요합니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("participantUserIds", participantUserIds);
        List<DocumentApprovalParticipantVO> activeParticipants =
                documentApprovalDAO.selectActiveParticipants(params);
        Map<String, DocumentApprovalParticipantVO> participantsById = new HashMap<>();
        if (activeParticipants != null) {
            for (DocumentApprovalParticipantVO participant : activeParticipants) {
                participantsById.put(participant.getUserId(), participant);
            }
        }
        if (participantsById.size() != userIds.size() || !participantsById.keySet().containsAll(userIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선에 사용할 수 없는 사용자가 포함되어 있습니다.");
        }
        return participantsById;
    }

    private Map<String, Object> documentParams(LoginVO user, DocumentApprovalDraftSaveRequestVO request,
            Map<String, Object> actor) {
        Map<String, Object> params = new HashMap<>(actor);
        params.put("draftingWorkCategoryId", request.getDraftingWorkCategoryId());
        params.put("documentType", request.getDocumentType().trim());
        String title = request.getTitle().trim();
        params.put("title", title);
        params.put("contentsJson", documentSanitizer.sanitizeJson(request.getContentsJson()).toString());
        String safeHtml = documentSanitizer.sanitizeHtml(request.getContentsHtml());
        params.put("contentsHtml", safeHtml);
        params.put("contentsText", Jsoup.parseBodyFragment(safeHtml).text());
        params.put("drafterDepartmentName", user.getDepartmentName());
        return params;
    }

    private void replaceApprovalLines(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception {
        Map<String, Object> deleteParams = new HashMap<>();
        deleteParams.put("tenantId", user.getTenantId());
        deleteParams.put("electronicApprovalId", approvalId);
        documentApprovalDAO.deleteDocumentApprovalLines(deleteParams);

        for (ApprovalLineVO line : approvalLines) {
            DocumentApprovalParticipantVO participant = participants.get(line.getParticipantUserId().trim());
            Map<String, Object> params = new HashMap<>(deleteParams);
            params.put("stageOrder", line.getStageOrder());
            params.put("participantOrder", line.getParticipantOrder());
            params.put("participantType", line.getParticipantType());
            params.put("participantUserId", participant.getUserId());
            params.put("participantName", participant.getUserName());
            params.put("participantDepartmentName", participant.getDepartmentName());
            params.put("actionStatus", "REFERENCE".equals(line.getParticipantType()) ? null : "WAITING");
            if (documentApprovalDAO.insertDocumentApprovalLine(params) != 1) {
                throw new IllegalStateException("결재선 저장에 실패했습니다.");
            }
        }
    }

    private void insertDraftSavedMessage(LoginVO user, Long approvalId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", approvalId);
        params.put("commentType", SYSTEM_COMMENT_TYPE);
        params.put("eventType", DRAFT_SAVED_EVENT);
        params.put("content", "문서가 임시저장되었습니다.");
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        if (commonCommentDAO.insertSystemComment(params) == null) {
            throw new IllegalStateException("임시저장 시스템 이력 기록에 실패했습니다.");
        }
    }

    private void requireDraftOwner(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 없습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        String drafterId = documentApprovalDAO.selectDraftDrafterId(params);
        if (drafterId == null || !drafterId.equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }
    }

    private Map<String, Object> actorParams(LoginVO user) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("drafterId", user.getId());
        params.put("drafterUserId", user.getUniqId());
        params.put("drafterName", user.getName());
        params.put("documentStatus", "DRAFT");
        return params;
    }

    private DocumentApprovalDraftVO draftResponse(Long approvalId) {
        DocumentApprovalDraftVO response = new DocumentApprovalDraftVO();
        response.setElectronicApprovalId(approvalId);
        response.setDocumentStatus("DRAFT");
        return response;
    }
}
