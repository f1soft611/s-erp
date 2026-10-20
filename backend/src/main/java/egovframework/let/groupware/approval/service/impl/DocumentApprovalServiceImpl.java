package egovframework.let.groupware.approval.service.impl;

import egovframework.let.groupware.approval.domain.model.DocumentApprovalFileItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.Locale;
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
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO.ApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineBatchVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWorkflowDocumentVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.service.DocumentApprovalService;

@Service("documentApprovalService")
public class DocumentApprovalServiceImpl implements DocumentApprovalService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String COMMENT_FILE_OWNER_TYPE = "APPROVAL_COMMENT";
    private static final String USER_COMMENT_TYPE = "USER";
    private static final String SYSTEM_COMMENT_TYPE = "SYSTEM";
    private static final String DRAFT_SAVED_EVENT = "DRAFT_SAVED";
    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> PARTICIPANT_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("APPROVAL", "AGREEMENT", "REFERENCE")));
    private static final Set<String> DOCUMENT_STATUSES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFT", "PENDING", "IN_PROGRESS", "REVISION_REQUESTED", "COMPLETED", "REJECTED")));
    private static final Set<String> DOCUMENT_SCOPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "ALL", "MY_PENDING", "IN_PROGRESS", "DRAFT", "COMPLETED", "REVISION_REQUESTED", "REJECTED")));
    private static final Set<String> DOCUMENT_SORT_FIELDS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "electronicApprovalId", "eabusNo", "title", "documentType", "documentStatus", "submittedAt",
            "drafterName", "drafterDepartmentName", "myParticipantType", "myActionStatus",
            "currentApprovalStep", "participantName", "approvalProgress", "updatedAt")));
    private static final Set<String> APPROVAL_LINE_ACTION_STATUSES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("WAITING", "PENDING", "APPROVED", "REJECTED", "RETURNED")));

    private final DocumentApprovalDAO documentApprovalDAO;
    private final CommonCommentDAO commonCommentDAO;
    private final CommonFileService commonFileService;
    private final RichTextDocumentSanitizer documentSanitizer;
    private final EmbeddedImageStorageService imageStorageService;
    private final EmbeddedImageDocumentProcessor imageDocumentProcessor;

    public DocumentApprovalServiceImpl(DocumentApprovalDAO documentApprovalDAO, CommonCommentDAO commonCommentDAO,
            CommonFileService commonFileService, RichTextDocumentSanitizer documentSanitizer,
            EmbeddedImageStorageService imageStorageService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonCommentDAO = commonCommentDAO;
        this.commonFileService = commonFileService;
        this.documentSanitizer = documentSanitizer;
        this.imageStorageService = imageStorageService;
        this.imageDocumentProcessor = new EmbeddedImageDocumentProcessor(imageStorageService, documentSanitizer);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO saveDraft(LoginVO user, DocumentApprovalDraftSaveRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        validateDraftRequest(request);
        Map<String, Object> actor = actorParams(user);
        validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        Map<String, DocumentApprovalParticipantVO> participants = validateParticipants(request, user);

        Map<String, Object> documentParams = documentParams(user, request, actor);
        Long approvalId = documentApprovalDAO.insertDocumentApprovalMain(documentParams);
        if (approvalId == null) {
            throw new IllegalStateException("전자결재 문서 ID를 확인할 수 없습니다.");
        }
        EmbeddedImageDocumentProcessor.Result imageSave = processEmbeddedImages(user, approvalId, request);
        applyProcessedBody(documentParams, imageSave);
        documentParams.put("electronicApprovalId", approvalId);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new IllegalStateException("본문 이미지 저장에 실패했습니다.");
        }

        replaceApprovalLines(user, approvalId, request.getApprovalLines(), participants);
        insertDraftSavedMessage(user, approvalId);
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, approvalId,
                toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
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
        Map<String, DocumentApprovalParticipantVO> participants = validateParticipants(request, user);
        Map<String, Object> documentParams = documentParams(user, request, actor);
        EmbeddedImageDocumentProcessor.Result imageSave = processEmbeddedImages(user, electronicApprovalId, request);
        applyProcessedBody(documentParams, imageSave);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }

        replaceApprovalLines(user, electronicApprovalId, request.getApprovalLines(), participants);
        insertDraftSavedMessage(user, electronicApprovalId);
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, electronicApprovalId,
                toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
        return persistedDraftResponse(user, electronicApprovalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO submit(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        validateDraftRequest(request);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재신청할 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"DRAFT".equals(previousStatus) && !"REVISION_REQUESTED".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재신청할 수 없습니다.");
        }

        validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        boolean businessContact = "BUSINESS_CONTACT".equals(request.getDocumentType().trim());
        Map<String, DocumentApprovalParticipantVO> participants = validateParticipants(request, user);
        if (businessContact) {
            if (request.getApprovalLines().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발송할 참조자를 선택해 주세요.");
            }
        } else {
            validateSubmissionLines(request.getApprovalLines(), user);
        }

        Map<String, Object> documentParams = documentParams(user, request, params);
        EmbeddedImageDocumentProcessor.Result imageSave = processEmbeddedImages(user, electronicApprovalId, request);
        applyProcessedBody(documentParams, imageSave);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서가 변경되어 결재신청할 수 없습니다.");
        }

        if (businessContact) {
            replaceApprovalLines(user, electronicApprovalId, request.getApprovalLines(), participants);
        } else {
            replaceApprovalLinesForSubmission(user, electronicApprovalId, request.getApprovalLines(), participants);
        }
        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", businessContact ? "COMPLETED" : "PENDING");
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 결재신청할 수 없습니다.");
        }

        String eventType = businessContact ? "COMPLETED"
                : "REVISION_REQUESTED".equals(previousStatus) ? "RESUBMITTED" : "SUBMITTED";
        insertSystemEvent(user, electronicApprovalId, eventType,
                businessContact ? "업무연락이 발송되었습니다."
                    : "RESUBMITTED".equals(eventType) ? "문서가 재상신되었습니다." : "문서가 결재신청되었습니다.");
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, electronicApprovalId,
                toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
        return persistedDraftResponse(user, electronicApprovalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO processAction(LoginVO user, Long electronicApprovalId,
            DocumentApprovalActionRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0 || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재 처리 정보가 올바르지 않습니다.");
        }
        String action = request.getAction();
        if (!"APPROVED".equals(action) && !"REJECTED".equals(action) && !"RETURNED".equals(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 결재 처리입니다.");
        }
        String actionComment = request.getActionComment() == null ? null : request.getActionComment().trim();
        if (("REJECTED".equals(action) || "RETURNED".equals(action)) && !StringUtils.hasText(actionComment)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반려 또는 보완요청 사유를 입력해 주세요.");
        }
        if (!StringUtils.hasText(actionComment)) {
            actionComment = null;
        }

        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"PENDING".equals(previousStatus) && !"IN_PROGRESS".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재 처리할 수 없습니다.");
        }

        params.put("participantUserId", user.getUniqId());
        DocumentApprovalLineVO currentLine = documentApprovalDAO.selectCurrentPendingApprovalLine(params);
        if (currentLine == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 처리할 수 있는 결재선이 없습니다.");
        }

        Map<String, Object> lineParams = new HashMap<>(params);
        lineParams.put("electronicApprovalLineId", currentLine.getElectronicApprovalLineId());
        lineParams.put("participantUserId", user.getUniqId());
        lineParams.put("actionStatus", action);
        lineParams.put("actionComment", actionComment);
        if (documentApprovalDAO.updateApprovalLineAction(lineParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결재선이 변경되어 처리할 수 없습니다.");
        }

        String nextStatus;
        boolean completed = false;
        if ("REJECTED".equals(action)) {
            nextStatus = "REJECTED";
        } else if ("RETURNED".equals(action)) {
            nextStatus = "REVISION_REQUESTED";
        } else {
            Map<String, Object> stageParams = new HashMap<>(params);
            stageParams.put("stageOrder", currentLine.getStageOrder());
            Long pendingCount = documentApprovalDAO.selectPendingApprovalCountForStage(stageParams);
            if (pendingCount == null) {
                throw new IllegalStateException("현재 결재 단계 정보를 확인할 수 없습니다.");
            }
            if (pendingCount > 0) {
                nextStatus = "IN_PROGRESS";
            } else {
                Integer nextStage = documentApprovalDAO.selectNextWaitingApprovalStage(params);
                if (nextStage == null) {
                    nextStatus = "COMPLETED";
                    completed = true;
                } else {
                    stageParams.put("stageOrder", nextStage);
                    if (documentApprovalDAO.activateApprovalStage(stageParams) <= 0) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "다음 결재 단계를 활성화할 수 없습니다.");
                    }
                    nextStatus = "IN_PROGRESS";
                }
            }
        }

        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", nextStatus);
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 처리할 수 없습니다.");
        }

        String actionText = "APPROVED".equals(action) ? "문서가 승인되었습니다."
                : "REJECTED".equals(action) ? "문서가 반려되었습니다." : "문서 보완이 요청되었습니다.";
        insertSystemEvent(user, electronicApprovalId, action,
                StringUtils.hasText(actionComment) ? actionText + " 사유: " + actionComment : actionText);
        if (completed) {
            insertSystemEvent(user, electronicApprovalId, "COMPLETED", "문서 결재가 완료되었습니다.");
        }
        return workflowResponse(electronicApprovalId, nextStatus);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO cancelSubmission(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재신청할 문서를 찾을 수 없습니다.");
        }
        if (!"PENDING".equals(document.getDocumentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재신청을 취소할 수 없습니다.");
        }

        Map<String, Object> documentParams = new HashMap<>(params);
        documentParams.put("actorId", user.getId());
        if (documentApprovalDAO.resetSubmittedDocumentToDraft(documentParams) != 1
                || documentApprovalDAO.resetSubmittedApprovalLines(params) <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 결재신청을 취소할 수 없습니다.");
        }
        insertSystemEvent(user, electronicApprovalId, "SUBMISSION_CANCELED", "결재신청이 취소되었습니다.");
        return workflowResponse(electronicApprovalId, "DRAFT");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO cancelApproval(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("participantUserId", user.getUniqId());
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"PENDING".equals(previousStatus) && !"IN_PROGRESS".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 승인을 취소할 수 없습니다.");
        }

        DocumentApprovalLineVO approvedLine =
                documentApprovalDAO.selectUserApprovedApprovalLineForUpdate(params);
        if (approvedLine == null || approvedLine.getStageOrder() == null
                || approvedLine.getStageOrder() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소할 본인의 승인 결재선이 없습니다.");
        }
        params.put("stageOrder", approvedLine.getStageOrder());
        if (!Boolean.FALSE.equals(documentApprovalDAO.selectProcessedLaterApprovalStage(params))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "다음 결재 단계가 처리되어 승인을 취소할 수 없습니다.");
        }

        Map<String, Object> lineParams = new HashMap<>(params);
        lineParams.put("electronicApprovalLineId", approvedLine.getElectronicApprovalLineId());
        if (documentApprovalDAO.resetApprovalLineToPending(lineParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결재선이 변경되어 승인을 취소할 수 없습니다.");
        }
        documentApprovalDAO.resetUntouchedLaterApprovalStages(params);

        Long processedCount = documentApprovalDAO.countProcessedApprovalLines(params);
        if (processedCount == null) {
            throw new IllegalStateException("남은 결재 처리 상태를 확인할 수 없습니다.");
        }
        String nextStatus = processedCount > 0 ? "IN_PROGRESS" : "PENDING";
        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", nextStatus);
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 승인을 취소할 수 없습니다.");
        }
        insertSystemEvent(user, electronicApprovalId, "APPROVAL_CANCELED", "결재 승인이 취소되었습니다.");
        return workflowResponse(electronicApprovalId, nextStatus);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalFilePageVO listFiles(LoginVO user, String scope, String documentType,
            Long electronicApprovalId, Long beforeFileId) throws Exception {
        validateAuthenticatedUser(user);
        String effectiveScope = scope == null ? "ALL" : scope;
        if (!DOCUMENT_SCOPES.contains(effectiveScope)
                || (documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && (electronicApprovalId <= 0 || electronicApprovalId > 9007199254740991L))
                || (beforeFileId != null && (beforeFileId <= 0 || beforeFileId > 9007199254740991L))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 조회 조건이 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("scope", effectiveScope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("beforeFileId", beforeFileId);
        if (beforeFileId != null && documentApprovalDAO.selectRelatedFileCursor(params) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 목록이 변경되었습니다. 목록을 새로고침해 주세요.");
        }
        List<DocumentApprovalFileItemVO> files = documentApprovalDAO.selectRelatedFilePage(params);
        if (files == null) {
            throw new IllegalStateException("전자결재 파일 조회 결과를 확인할 수 없습니다.");
        }
        boolean hasNext = files.size() > 20;
        List<DocumentApprovalFileItemVO> visible = new ArrayList<>(files.subList(0, Math.min(20, files.size())));
        DocumentApprovalFilePageVO page = new DocumentApprovalFilePageVO();
        page.setResultList(visible);
        page.setHasNext(hasNext);
        page.setNextBeforeFileId(hasNext ? visible.get(19).getFileId() : null);
        return page;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalListItemVO> listDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        Set<String> scopes = new HashSet<>(Arrays.asList(
                "ALL", "MY_PENDING", "IN_PROGRESS", "DRAFT", "COMPLETED", "REVISION_REQUESTED", "REJECTED"));
        if (scope == null) {
            scope = "ALL";
        }
        if (!scopes.contains(scope)
                || (documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("scope", scope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        List<DocumentApprovalListItemVO> documents = documentApprovalDAO.selectRelatedDocumentList(params);
        return documents == null ? Collections.<DocumentApprovalListItemVO>emptyList() : documents;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalListPageVO searchDocuments(LoginVO user, String scope,
            DocumentApprovalListQueryVO query) throws Exception {
        validateAuthenticatedUser(user);
        if (scope == null) {
            scope = "ALL";
        }
        if (!DOCUMENT_SCOPES.contains(scope) || query == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        String documentType = normalizeText(query.getDocumentType());
        String documentStatus = normalizeText(query.getDocumentStatus());
        String myParticipantType = normalizeText(query.getMyParticipantType());
        String myActionStatus = normalizeText(query.getMyActionStatus());
        Long electronicApprovalId = query.getElectronicApprovalId();
        if ((documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (documentStatus != null && !DOCUMENT_STATUSES.contains(documentStatus))
                || (myParticipantType != null && !PARTICIPANT_TYPES.contains(myParticipantType))
                || (myActionStatus != null && !APPROVAL_LINE_ACTION_STATUSES.contains(myActionStatus))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        int offset = query.getOffset() == null ? 0 : query.getOffset();
        int limit = query.getLimit() == null ? 200 : query.getLimit();
        if (offset < 0 || limit < 1 || limit > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 범위가 올바르지 않습니다.");
        }

        String sortField = normalizeText(query.getSortField());
        if (sortField == null) {
            sortField = "updatedAt";
        } else if (!DOCUMENT_SORT_FIELDS.contains(sortField)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 정렬 조건이 올바르지 않습니다.");
        }
        String sortDirection = normalizeText(query.getSortDirection());
        if (sortDirection == null) {
            sortDirection = "DESC";
        } else {
            sortDirection = sortDirection.toUpperCase(Locale.ROOT);
            if (!"ASC".equals(sortDirection) && !"DESC".equals(sortDirection)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 정렬 조건이 올바르지 않습니다.");
            }
        }

        LocalDate submittedAtFrom = parseOptionalDate(query.getSubmittedAtFrom());
        LocalDate submittedAtTo = parseOptionalDate(query.getSubmittedAtTo());
        LocalDate updatedAtFrom = parseOptionalDate(query.getUpdatedAtFrom());
        LocalDate updatedAtTo = parseOptionalDate(query.getUpdatedAtTo());
        validateDateRange(submittedAtFrom, submittedAtTo);
        validateDateRange(updatedAtFrom, updatedAtTo);

        Map<String, Object> params = actorParams(user);
        params.put("scope", scope);
        params.put("documentType", documentType);
        params.put("documentStatus", documentStatus);
        params.put("electronicApprovalIdFilter", electronicApprovalId);
        params.put("keyword", normalizeText(query.getKeyword()));
        params.put("eabusNoFilter", normalizeText(query.getEabusNo()));
        params.put("titleFilter", normalizeText(query.getTitle()));
        params.put("drafterNameFilter", normalizeText(query.getDrafterName()));
        params.put("drafterDepartmentName", normalizeText(query.getDrafterDepartmentName()));
        params.put("participantName", normalizeText(query.getParticipantName()));
        params.put("myParticipantType", myParticipantType);
        params.put("myActionStatus", myActionStatus);
        params.put("currentApproverName", normalizeText(query.getCurrentApproverName()));
        params.put("submittedAtFrom", submittedAtFrom == null ? null : submittedAtFrom.toString());
        params.put("submittedAtTo", submittedAtTo == null ? null : submittedAtTo.toString());
        params.put("updatedAtFrom", updatedAtFrom == null ? null : updatedAtFrom.toString());
        params.put("updatedAtTo", updatedAtTo == null ? null : updatedAtTo.toString());
        params.put("offset", offset);
        params.put("limit", limit);
        params.put("sortField", sortField);
        params.put("sortDirection", sortDirection);

        List<DocumentApprovalStatusListItemVO> resultList = documentApprovalDAO.selectRelatedDocumentPage(params);
        Long totalRowCount = documentApprovalDAO.countRelatedDocuments(params);
        if (resultList == null || totalRowCount == null) {
            throw new IllegalStateException("전자결재 문서 검색 결과를 확인할 수 없습니다.");
        }

        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(resultList);
        page.setTotalRowCount(totalRowCount);
        return page;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalFeedItemVO> listFeedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        List<DocumentApprovalListItemVO> documents = listDocuments(user, scope, documentType, electronicApprovalId);
        if (documents == null || documents.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> distinctApprovalIds = new LinkedHashSet<>();
        for (DocumentApprovalListItemVO listItem : documents) {
            if (listItem != null) {
                if (listItem.getElectronicApprovalId() == null) {
                    throw new IllegalStateException("전자결재 목록 항목에 문서 ID가 없습니다.");
                }
                distinctApprovalIds.add(listItem.getElectronicApprovalId());
            }
        }
        if (distinctApprovalIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> approvalIds = new ArrayList<>(distinctApprovalIds);
        Map<String, Object> detailParams = actorParams(user);
        detailParams.put("participantUserId", user.getUniqId());
        detailParams.put("ownerIds", approvalIds);
        List<DocumentApprovalDetailVO> details = documentApprovalDAO.selectDocumentApprovalDetailsByIds(detailParams);
        Map<Long, DocumentApprovalDetailVO> detailsByApprovalId = new HashMap<>();
        if (details != null) {
            for (DocumentApprovalDetailVO detail : details) {
                if (detail != null && detail.getElectronicApprovalId() != null) {
                    detailsByApprovalId.put(detail.getElectronicApprovalId(), detail);
                }
            }
        }
        for (Long approvalId : approvalIds) {
            if (!detailsByApprovalId.containsKey(approvalId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
            }
        }

        Map<String, Object> lineParams = new HashMap<>();
        lineParams.put("tenantId", user.getTenantId());
        lineParams.put("ownerIds", approvalIds);
        List<DocumentApprovalLineBatchVO> batchLines =
            documentApprovalDAO.selectApprovalLinesByOwnerIds(lineParams);
        Map<Long, List<DocumentApprovalLineVO>> approvalLinesByApprovalId = new HashMap<>();
        if (batchLines != null) {
            for (DocumentApprovalLineBatchVO batchLine : batchLines) {
                if (batchLine == null || batchLine.getElectronicApprovalId() == null) {
                    continue;
                }
                approvalLinesByApprovalId.computeIfAbsent(
                    batchLine.getElectronicApprovalId(), key -> new ArrayList<>())
                    .add(copyApprovalLine(batchLine));
            }
        }

        Map<Long, List<CommonFileVO>> attachmentsByApprovalId =
                commonFileService.listFilesByOwnerIds(user.getTenantId(), OWNER_TYPE, approvalIds);
        Map<Long, DocumentApprovalCommentPageVO> commentPagesByApprovalId =
            listApprovalCommentStreamPagesByOwnerIds(user, approvalIds, 3, null);

        List<DocumentApprovalFeedItemVO> feedItems = new ArrayList<>();
        for (DocumentApprovalListItemVO listItem : documents) {
            if (listItem == null) {
                continue;
            }
            Long approvalId = listItem.getElectronicApprovalId();
            DocumentApprovalDetailVO detail = detailsByApprovalId.get(approvalId);
            if (detail == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
            }
            DocumentApprovalCommentPageVO commentPage = commentPagesByApprovalId.get(approvalId);
            if (commentPage == null) {
                throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
            }

            DocumentApprovalFeedItemVO feedItem = new DocumentApprovalFeedItemVO();
            feedItem.setElectronicApprovalId(listItem.getElectronicApprovalId());
            feedItem.setEabusNo(listItem.getEabusNo());
            feedItem.setDocumentType(listItem.getDocumentType());
            feedItem.setDocumentStatus(listItem.getDocumentStatus());
            feedItem.setTitle(listItem.getTitle());
            feedItem.setDrafterName(listItem.getDrafterName());
            feedItem.setCreatedAt(listItem.getCreatedAt());
            feedItem.setUpdatedAt(listItem.getUpdatedAt());
            feedItem.setSubmittedAt(listItem.getSubmittedAt());
            feedItem.setSummary(listItem.getSummary());
            feedItem.setNoticeType(listItem.getNoticeType());
            feedItem.setDraftingWorkCategoryId(detail.getDraftingWorkCategoryId());
            feedItem.setContentsJson(detail.getContentsJson());
            feedItem.setContentsHtml(detail.getContentsHtml());
            feedItem.setContentsText(detail.getContentsText());
            feedItem.setViewCount(detail.getViewCount());
            feedItem.setDrafter(detail.isDrafter());
            feedItem.setApprovalLines(approvalLinesByApprovalId.getOrDefault(
                approvalId, Collections.emptyList()));
            feedItem.setAttachments(attachmentsByApprovalId.getOrDefault(approvalId, Collections.emptyList()));
            feedItem.setSystemEvents(commentPage.getSystemEvents());
            feedItem.setComments(commentPage.getComments());
            feedItem.setCommentCount(commentPage.getResultCnt());
            feedItem.setHasPreviousComments(commentPage.isHasPrevious());
            feedItem.setNextBeforeCommentId(commentPage.getNextBeforeCommentId());
            feedItems.add(feedItem);
        }
        return feedItems;
    }

    private Map<Long, DocumentApprovalCommentPageVO> listApprovalCommentStreamPagesByOwnerIds(
            LoginVO user, List<Long> approvalIds, int limit, Long beforeCommentId) throws Exception {
        if (approvalIds == null || approvalIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Object> params = approvalCommentParams(user, null, beforeCommentId);
        params.put("ownerIds", approvalIds);
        params.put("limit", limit + 1);
        params.put("beforeCommentId", beforeCommentId);
        List<CommonCommentVO> fetchedRoots =
            commonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds(params);
        if (fetchedRoots == null) {
            throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
        }

        Map<Long, List<CommonCommentVO>> rootsByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            rootsByOwnerId.put(approvalId, new ArrayList<>());
        }
        for (CommonCommentVO root : fetchedRoots) {
            if (root == null || root.getOwnerId() == null || root.getCommentId() == null) {
                throw new IllegalStateException("전자결재 댓글 페이지 항목이 올바르지 않습니다.");
            }
            List<CommonCommentVO> ownerRoots = rootsByOwnerId.get(root.getOwnerId());
            if (ownerRoots == null ||
                    !("USER".equals(root.getCommentType()) || "SYSTEM".equals(root.getCommentType()))) {
                throw new IllegalStateException("전자결재 댓글 페이지 항목이 올바르지 않습니다.");
            }
            ownerRoots.add(root);
        }

        List<Map<String, Object>> countRows =
            commonCommentDAO.selectApprovalCommentStreamCountsByOwnerIds(params);
        if (countRows == null) {
            throw new IllegalStateException("전자결재 댓글 건수 조회 결과가 없습니다.");
        }
        Map<Long, Long> countsByOwnerId = new HashMap<>();
        for (Map<String, Object> row : countRows) {
            if (row == null || !(row.get("ownerId") instanceof Number)
                    || !(row.get("totalCount") instanceof Number)) {
                throw new IllegalStateException("전자결재 댓글 건수 조회 결과가 올바르지 않습니다.");
            }
            countsByOwnerId.put(
                ((Number) row.get("ownerId")).longValue(),
                ((Number) row.get("totalCount")).longValue());
        }

        Map<Long, List<CommonCommentVO>> rootsInPageByOwnerId = new HashMap<>();
        List<Long> userRootIds = new ArrayList<>();
        for (Long approvalId : approvalIds) {
            List<CommonCommentVO> roots = rootsByOwnerId.get(approvalId);
            int selectedCount = Math.min(limit, roots.size());
            List<CommonCommentVO> selectedRoots = new ArrayList<>(roots.subList(0, selectedCount));
            Collections.reverse(selectedRoots);
            rootsInPageByOwnerId.put(approvalId, selectedRoots);
            for (CommonCommentVO root : selectedRoots) {
                if ("USER".equals(root.getCommentType())) {
                    userRootIds.add(root.getCommentId());
                }
            }
        }

        List<CommonCommentVO> userThreads = Collections.emptyList();
        if (!userRootIds.isEmpty()) {
            Map<String, Object> threadParams = new HashMap<>();
            threadParams.put("tenantId", user.getTenantId());
            threadParams.put("ownerIds", approvalIds);
            threadParams.put("rootIds", userRootIds);
            userThreads = commonCommentDAO.selectApprovalUserCommentThreadsByRootIds(threadParams);
            if (userThreads == null) {
                throw new IllegalStateException("전자결재 댓글 답글 조회 결과가 없습니다.");
            }
        }

        Set<Long> commentIds = new LinkedHashSet<>();
        Map<Long, List<CommonCommentVO>> commentsByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            commentsByOwnerId.put(approvalId, new ArrayList<>());
        }
        for (CommonCommentVO comment : userThreads) {
            if (comment == null || comment.getOwnerId() == null || comment.getCommentId() == null) {
                throw new IllegalStateException("전자결재 댓글 답글 항목이 올바르지 않습니다.");
            }
            List<CommonCommentVO> ownerComments = commentsByOwnerId.get(comment.getOwnerId());
            if (ownerComments == null) {
                throw new IllegalStateException("전자결재 댓글 답글 항목이 올바르지 않습니다.");
            }
            ownerComments.add(comment);
            if (!"Y".equalsIgnoreCase(comment.getDeletedYn())) {
                commentIds.add(comment.getCommentId());
            }
        }

        Map<Long, List<CommonFileVO>> filesByCommentId = commentIds.isEmpty()
            ? Collections.<Long, List<CommonFileVO>>emptyMap()
            : commonFileService.listFilesByOwnerIds(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, new ArrayList<>(commentIds));
        if (filesByCommentId == null) {
            throw new IllegalStateException("전자결재 댓글 첨부파일 조회 결과가 없습니다.");
        }
        for (List<CommonCommentVO> comments : commentsByOwnerId.values()) {
            for (CommonCommentVO comment : comments) {
                if ("Y".equalsIgnoreCase(comment.getDeletedYn())) {
                    comment.setContent("[삭제된 댓글입니다.]");
                    comment.setWriterName("삭제된 댓글");
                    comment.setWriterId(null);
                    comment.setAttachments(new ArrayList<>());
                } else {
                    List<CommonFileVO> attachments = filesByCommentId.getOrDefault(
                        comment.getCommentId(), Collections.emptyList());
                    comment.setAttachments(
                        attachments == null ? Collections.<CommonFileVO>emptyList() : attachments);
                }
            }
        }

        Map<Long, DocumentApprovalCommentPageVO> pagesByOwnerId = new HashMap<>();
        for (Long approvalId : approvalIds) {
            List<CommonCommentVO> roots = rootsByOwnerId.get(approvalId);
            int selectedCount = Math.min(limit, roots.size());
            boolean hasPrevious = roots.size() > limit;
            List<CommonCommentVO> selectedRoots = rootsInPageByOwnerId.get(approvalId);
            List<CommonCommentVO> systemEvents = new ArrayList<>();
            for (CommonCommentVO root : selectedRoots) {
                if ("SYSTEM".equals(root.getCommentType())) {
                    systemEvents.add(root);
                }
            }

            DocumentApprovalCommentPageVO page = new DocumentApprovalCommentPageVO();
            page.setComments(commentsByOwnerId.get(approvalId));
            page.setSystemEvents(systemEvents);
            page.setHasPrevious(hasPrevious);
            page.setNextBeforeCommentId(
                hasPrevious && selectedCount > 0 ? roots.get(selectedCount - 1).getCommentId() : null);
            page.setResultCnt(countsByOwnerId.getOrDefault(approvalId, 0L));
            pagesByOwnerId.put(approvalId, page);
        }
        return pagesByOwnerId;
    }

    private DocumentApprovalLineVO copyApprovalLine(DocumentApprovalLineBatchVO batchLine) {
        DocumentApprovalLineVO line = new DocumentApprovalLineVO();
        line.setElectronicApprovalLineId(batchLine.getElectronicApprovalLineId());
        line.setStageOrder(batchLine.getStageOrder());
        line.setParticipantOrder(batchLine.getParticipantOrder());
        line.setParticipantType(batchLine.getParticipantType());
        line.setParticipantUserId(batchLine.getParticipantUserId());
        line.setParticipantName(batchLine.getParticipantName());
        line.setParticipantDepartmentName(batchLine.getParticipantDepartmentName());
        line.setParticipantProfileImage(batchLine.getParticipantProfileImage());
        line.setParticipantStampImage(batchLine.getParticipantStampImage());
        line.setActionStatus(batchLine.getActionStatus());
        line.setPendingAt(batchLine.getPendingAt());
        line.setActionAt(batchLine.getActionAt());
        line.setActionComment(batchLine.getActionComment());
        return line;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalSummaryVO getSummary(LoginVO user) throws Exception {
        validateAuthenticatedUser(user);
        Map<String, Object> params = actorParams(user);
        DocumentApprovalSummaryVO summary = documentApprovalDAO.selectDocumentApprovalSummary(params);
        if (summary == null) {
            throw new IllegalStateException("전자결재 요약을 조회할 수 없습니다.");
        }
        List<DocumentApprovalListItemVO> notices = documentApprovalDAO.selectApprovalNotices(params);
        summary.setNotices(notices == null ? Collections.<DocumentApprovalListItemVO>emptyList() : notices);
        return summary;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDetailVO getDetail(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalDetailVO detail = documentApprovalDAO.selectDocumentApprovalDetail(params);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }

        Map<String, Object> loginParams = new HashMap<>();
        loginParams.put("tenantId", user.getTenantId());
        loginParams.put("loginCode", user.getId());
        Long loginId = documentApprovalDAO.selectLoginIdByLoginCode(loginParams);
        if (loginId == null) {
            throw new IllegalStateException("인증된 로그인 계정을 찾을 수 없습니다.");
        }

        Map<String, Object> viewParams = new HashMap<>();
        viewParams.put("tenantId", user.getTenantId());
        viewParams.put("electronicApprovalId", electronicApprovalId);
        viewParams.put("loginId", loginId);
        Long viewHistoryId = documentApprovalDAO.insertElectronicApprovalViewHistory(viewParams);
        if (viewHistoryId != null
                && documentApprovalDAO.incrementElectronicApprovalViewCount(viewParams) != 1) {
            throw new IllegalStateException("전자결재 문서 조회수를 갱신할 수 없습니다.");
        }

        detail = documentApprovalDAO.selectDocumentApprovalDetail(params);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }
        detail.setAttachments(commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId));
        detail.setApprovalLines(documentApprovalDAO.selectApprovalLines(params));
        Map<String, Object> commentParams = new HashMap<>();
        commentParams.put("tenantId", user.getTenantId());
        commentParams.put("ownerId", electronicApprovalId);
        List<CommonCommentVO> events = commonCommentDAO.selectApprovalSystemEvents(commentParams);
        detail.setSystemEvents(events == null ? Collections.<CommonCommentVO>emptyList() : events);
        return detail;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDocumentApproval(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("participantUserId", user.getUniqId());
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 문서를 찾을 수 없습니다.");
        }
        boolean canDelete = "DRAFT".equals(document.getDocumentStatus())
                || ("PENDING".equals(document.getDocumentStatus())
                        && Boolean.TRUE.equals(
                                documentApprovalDAO.selectCanDeletePendingDocumentApproval(params)));
        if (!canDelete) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 문서를 삭제할 수 없습니다.");
        }
        params.put("actorId", user.getId());
        if (documentApprovalDAO.softDeleteDocumentApproval(params) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 삭제할 수 없습니다.");
        }
        insertSystemEvent(user, electronicApprovalId, "DELETED", "문서가 삭제되었습니다.");
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalCommentPageVO listApprovalComments(LoginVO user, Long electronicApprovalId,
            Integer limit, Long beforeCommentId) throws Exception {
        requireRelatedDocument(user, electronicApprovalId);
        int safeLimit = limit == null ? 3 : limit;
        if (safeLimit < 1 || safeLimit > 100 || (beforeCommentId != null && beforeCommentId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 조건이 올바르지 않습니다.");
        }

        if (beforeCommentId != null) {
            Map<String, Object> cursorParams =
                approvalCommentParams(user, electronicApprovalId, beforeCommentId);
            if (commonCommentDAO.selectApprovalCommentStreamCursor(cursorParams) == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 cursor가 올바르지 않습니다.");
            }
        }

        DocumentApprovalCommentPageVO page = listApprovalCommentStreamPagesByOwnerIds(
            user, Collections.singletonList(electronicApprovalId), safeLimit, beforeCommentId)
            .get(electronicApprovalId);
        if (page == null) {
            throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
        }
        return page;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonCommentVO createApprovalComment(LoginVO user, Long electronicApprovalId,
            String content, Long parentCommentId) throws Exception {
        requireRelatedDocument(user, electronicApprovalId);
        String normalizedContent = normalizeApprovalCommentContent(content);
        if (parentCommentId != null) {
            if (parentCommentId <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 댓글 ID가 올바르지 않습니다.");
            }
            CommonCommentVO parent = commonCommentDAO.selectApprovalUserCommentById(
                    approvalCommentParams(user, electronicApprovalId, parentCommentId));
            if (parent == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 댓글을 찾을 수 없습니다.");
            }
        }

        Map<String, Object> params = approvalCommentParams(user, electronicApprovalId, null);
        params.put("parentCommentId", parentCommentId);
        params.put("content", normalizedContent);
        params.put("commentType", USER_COMMENT_TYPE);
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        params.put("deletedYn", "N");
        Long commentId = commonCommentDAO.insertCommonComment(params);
        if (commentId == null) {
            throw new IllegalStateException("등록된 댓글 ID를 확인할 수 없습니다.");
        }
        CommonCommentVO created = commonCommentDAO.selectApprovalUserCommentById(
                approvalCommentParams(user, electronicApprovalId, commentId));
        if (created == null) {
            throw new IllegalStateException("등록된 댓글을 다시 조회할 수 없습니다.");
        }
        return created;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonCommentVO updateApprovalComment(LoginVO user, Long electronicApprovalId,
            Long commentId, String content) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        String normalizedContent = normalizeApprovalCommentContent(content);
        Map<String, Object> params = approvalCommentParams(user, electronicApprovalId, commentId);
        params.put("content", normalizedContent);
        params.put("actorId", user.getId());
        params.put("actorName", user.getName());
        if (commonCommentDAO.updateApprovalUserComment(params) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
        comment.setContent(normalizedContent);
        comment.setLastModifiedBy(user.getId());
        comment.setLastModifiedByName(user.getName());
        return comment;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteApprovalComment(LoginVO user, Long electronicApprovalId, Long commentId) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        Map<String, Object> params = approvalCommentParams(user, electronicApprovalId, commentId);
        params.put("actorId", user.getId());
        params.put("actorName", user.getName());
        if (commonCommentDAO.softDeleteApprovalUserComment(params) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommonFileVO> listApprovalCommentAttachments(LoginVO user, Long electronicApprovalId,
            Long commentId) throws Exception {
        requireApprovalUserComment(user, electronicApprovalId, commentId);
        return listOwnedApprovalCommentFiles(user, commentId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonFileVO uploadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, MultipartFile file) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        return commonFileService.uploadFile(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, file, user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public void downloadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId, HttpServletResponse response) throws Exception {
        requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireOwnedApprovalCommentFile(user, commentId, fileId);
        commonFileService.downloadFile(user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, fileId, response);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        requireOwnedApprovalCommentFile(user, commentId, fileId);
        commonFileService.deleteFile(user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, fileId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmbeddedImageUploadVO uploadTemporaryEmbeddedImage(LoginVO user, MultipartFile file) throws Exception {
        validateAuthenticatedUser(user);
        return imageStorageService.uploadTemporaryImage(user.getTenantId(), file);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTemporaryEmbeddedImage(LoginVO user, String uploadToken, String fileName) throws Exception {
        validateAuthenticatedUser(user);
        imageStorageService.deleteTemporaryImage(user.getTenantId(), uploadToken, fileName);
    }

    @Override
    @Transactional(readOnly = true)
    public void streamEmbeddedImage(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception {
        requireRelatedDocument(user, electronicApprovalId);
        imageStorageService.streamOwnedImage(
                user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId, response);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommonFileVO> listAttachments(LoginVO user, Long electronicApprovalId) throws Exception {
        requireRelatedDocument(user, electronicApprovalId);
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
        requireRelatedDocument(user, electronicApprovalId);
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
                || request.getApprovalLines() == null
                || (!"BUSINESS_CONTACT".equals(request.getDocumentType().trim())
                    && request.getApprovalLines().isEmpty())) {
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

    private Map<String, DocumentApprovalParticipantVO> validateParticipants(DocumentApprovalDraftSaveRequestVO request,
            LoginVO user) throws Exception {
        List<ApprovalLineVO> approvalLines = request.getApprovalLines();
        boolean businessContact = "BUSINESS_CONTACT".equals(request.getDocumentType().trim());
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
            if (businessContact) {
                if (!"REFERENCE".equals(line.getParticipantType())
                        || line.getStageOrder() != 1
                        || line.getParticipantOrder() != participantUserIds.size() + 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업무연락은 순서대로 배치된 참조자만 지정할 수 있습니다.");
                }
                if (userId.equals(user.getUniqId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작성자는 참조자로 지정할 수 없습니다.");
                }
            }
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

        if (!businessContact && (!hasApprovalAction || !drafterIsFirstApprover)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선에 기안자의 1단계 결재가 필요합니다.");
        }

        if (participantUserIds.isEmpty()) {
            return Collections.emptyMap();
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
        String documentType = request.getDocumentType().trim();
        params.put("documentType", documentType);
        params.put("eabusNo", eabusNo(documentType));
        String title = request.getTitle().trim();
        params.put("title", title);
        params.put("contentsJson", documentSanitizer.sanitizeJson(request.getContentsJson()).toString());
        String safeHtml = documentSanitizer.sanitizeHtml(request.getContentsHtml());
        params.put("contentsHtml", safeHtml);
        params.put("contentsText", Jsoup.parseBodyFragment(safeHtml).text());
        params.put("drafterDepartmentName", user.getDepartmentName());
        return params;
    }

    private String eabusNo(String documentType) {
        switch (documentType) {
            case "DRAFTING":
                return "001";
            case "BUSINESS_CONTACT":
                return "008";
            case "EXPENSE_RESOLUTION":
                return "004";
            case "ATTENDANCE_APPLICATION":
                return "031";
            default:
                throw new IllegalArgumentException("지원하지 않는 문서 유형입니다.");
        }
    }

    private EmbeddedImageDocumentProcessor.Result processEmbeddedImages(
            LoginVO user, Long approvalId, DocumentApprovalDraftSaveRequestVO request) throws Exception {
        return imageDocumentProcessor.process(
                user.getTenantId(),
                OWNER_TYPE,
                approvalId,
                request.getContentsHtml(),
                request.getContentsJson(),
                toStorageUploads(request.getEmbeddedImages()),
                toStorageUploads(request.getTemporaryImages()),
                user.getId(),
                approvalImageUrlResolver(approvalId));
    }

    private void applyProcessedBody(
            Map<String, Object> documentParams, EmbeddedImageDocumentProcessor.Result imageSave) {
        documentParams.put("contentsHtml", imageSave.getHtml());
        documentParams.put("contentsJson", imageSave.getJson());
        documentParams.put("contentsText", Jsoup.parseBodyFragment(imageSave.getHtml()).text());
    }

    private List<EmbeddedImageUploadVO> toStorageUploads(List<DocumentApprovalEmbeddedImageVO> images) {
        List<EmbeddedImageUploadVO> uploads = new ArrayList<EmbeddedImageUploadVO>();
        if (images != null) {
            for (DocumentApprovalEmbeddedImageVO image : images) {
                if (image == null) {
                    continue;
                }
                EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
                upload.setUploadToken(image.getUploadToken());
                upload.setFileName(image.getFileName());
                uploads.add(upload);
            }
        }
        return uploads;
    }

    private EmbeddedImageDocumentProcessor.StableImageUrlResolver approvalImageUrlResolver(final Long approvalId) {
        return new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
            @Override
            public String toStableUrl(CommonFileVO image) {
                if (image == null || image.getFileId() == null) {
                    throw new IllegalStateException("본문 이미지 ID를 확인할 수 없습니다.");
                }
                return "/api/v1/groupware/approvals/" + approvalId
                        + "/embedded-images/" + image.getFileId();
            }

            @Override
            public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                URI uri;
                try {
                    uri = URI.create(source);
                } catch (IllegalArgumentException exception) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.", exception);
                }
                if (uri.isAbsolute()) {
                    return null;
                }
                String path = uri.getPath();
                if (path == null || !path.startsWith("/api/")) {
                    return null;
                }
                String expectedPrefix = "/api/v1/groupware/approvals/" + approvalId + "/embedded-images/";
                if (!path.startsWith(expectedPrefix) || uri.getRawQuery() != null || uri.getRawFragment() != null) {
                    throw new IllegalArgumentException("현재 문서에서 사용할 수 없는 본문 이미지 경로입니다.");
                }
                String fileIdValue = path.substring(expectedPrefix.length());
                if (!fileIdValue.matches("[1-9][0-9]*")) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.");
                }
                Long fileId;
                try {
                    fileId = Long.valueOf(fileIdValue);
                } catch (NumberFormatException exception) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.", exception);
                }
                if (ownedImages != null) {
                    for (CommonFileVO image : ownedImages) {
                        if (image != null && fileId.equals(image.getFileId())) {
                            return image;
                        }
                    }
                }
                throw new IllegalArgumentException("현재 문서가 소유하지 않은 본문 이미지입니다.");
            }
        };
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

    private void replaceApprovalLinesForSubmission(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception {
        Map<Integer, List<ApprovalLineVO>> stages = new TreeMap<>();
        for (ApprovalLineVO line : approvalLines) {
            if (!"REFERENCE".equals(line.getParticipantType())) {
                stages.computeIfAbsent(line.getStageOrder(), key -> new ArrayList<>()).add(line);
            }
        }
        int firstRealStage = stages.keySet().stream()
                .filter(stage -> stage != 1 || !stages.get(stage).get(0).getParticipantUserId()
                        .trim().equals(user.getUniqId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "기안자 외 결재자가 필요합니다."));

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
            if ("REFERENCE".equals(line.getParticipantType())) {
                params.put("actionStatus", null);
                params.put("pendingAt", null);
                params.put("actionAt", null);
            } else if (line.getStageOrder() == 1 && participant.getUserId().equals(user.getUniqId())) {
                params.put("actionStatus", "APPROVED");
                params.put("pendingAt", null);
                params.put("actionAt", new java.util.Date());
            } else if (line.getStageOrder() == firstRealStage) {
                params.put("actionStatus", "PENDING");
                params.put("pendingAt", new java.util.Date());
                params.put("actionAt", null);
            } else {
                params.put("actionStatus", "WAITING");
                params.put("pendingAt", null);
                params.put("actionAt", null);
            }
            params.put("actionComment", null);
            if (documentApprovalDAO.insertDocumentApprovalLine(params) != 1) {
                throw new IllegalStateException("결재선 저장에 실패했습니다.");
            }
        }
    }

    private void validateSubmissionLines(List<ApprovalLineVO> approvalLines, LoginVO user) {
        Map<Integer, List<ApprovalLineVO>> stages = new TreeMap<>();
        int maximumActionStage = 0;
        Integer referenceStage = null;
        int nonDrafterActionCount = 0;
        boolean hasDrafterFirst = false;

        for (ApprovalLineVO line : approvalLines) {
            stages.computeIfAbsent(line.getStageOrder(), key -> new ArrayList<>()).add(line);
            if ("REFERENCE".equals(line.getParticipantType())) {
                if (referenceStage == null) {
                    referenceStage = line.getStageOrder();
                } else if (!referenceStage.equals(line.getStageOrder())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자는 마지막 한 단계에 배치해야 합니다.");
                }
            } else {
                maximumActionStage = Math.max(maximumActionStage, line.getStageOrder());
                if (!user.getUniqId().equals(line.getParticipantUserId().trim())) {
                    nonDrafterActionCount++;
                }
                if (line.getStageOrder() == 1 && line.getParticipantOrder() == 1
                        && "APPROVAL".equals(line.getParticipantType())
                        && user.getUniqId().equals(line.getParticipantUserId().trim())) {
                    hasDrafterFirst = true;
                }
            }
        }

        int expectedStage = 1;
        for (Map.Entry<Integer, List<ApprovalLineVO>> entry : stages.entrySet()) {
            if (entry.getKey() != expectedStage++) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재 단계 순서는 연속되어야 합니다.");
            }
            List<ApprovalLineVO> stageLines = entry.getValue();
            stageLines.sort((left, right) -> left.getParticipantOrder().compareTo(right.getParticipantOrder()));
            String stageType = stageLines.get(0).getParticipantType();
            for (int index = 0; index < stageLines.size(); index++) {
                ApprovalLineVO line = stageLines.get(index);
                if (line.getParticipantOrder() != index + 1
                        || !stageType.equals(line.getParticipantType())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "단계 내 결재선 순서가 올바르지 않습니다.");
                }
            }
            if ("APPROVAL".equals(stageType) && stageLines.size() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일반 결재자는 한 단계에 한 명만 배치할 수 있습니다.");
            }
            if ("REFERENCE".equals(stageType) && entry.getKey() <= maximumActionStage) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자는 모든 결재 단계 뒤에 배치해야 합니다.");
            }
        }

        if (!hasDrafterFirst || nonDrafterActionCount == 0
                || (referenceStage != null && referenceStage != maximumActionStage + 1)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 순서 또는 참여자가 올바르지 않습니다.");
        }
    }

    private void insertSystemEvent(LoginVO user, Long approvalId, String eventType, String content) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", approvalId);
        params.put("commentType", SYSTEM_COMMENT_TYPE);
        params.put("eventType", eventType);
        params.put("content", content);
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        if (commonCommentDAO.insertSystemComment(params) == null) {
            throw new IllegalStateException("결재 시스템 이력 기록에 실패했습니다.");
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

    private Map<String, Object> approvalCommentParams(LoginVO user, Long electronicApprovalId, Long commentId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", electronicApprovalId);
        if (commentId != null) {
            params.put("commentId", commentId);
        }
        return params;
    }

    private CommonCommentVO requireApprovalUserComment(LoginVO user, Long electronicApprovalId,
            Long commentId) throws Exception {
        requireRelatedDocument(user, electronicApprovalId);
        if (commentId == null || commentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 ID가 올바르지 않습니다.");
        }
        CommonCommentVO comment = commonCommentDAO.selectApprovalUserCommentById(
                approvalCommentParams(user, electronicApprovalId, commentId));
        if (comment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
        return comment;
    }

    private void requireApprovalCommentAuthor(LoginVO user, CommonCommentVO comment) {
        if (!user.getId().equals(comment.getWriterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
    }

    private String normalizeApprovalCommentContent(String content) {
        String normalizedContent = content == null ? "" : content.trim();
        if (!StringUtils.hasText(normalizedContent)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해 주세요.");
        }
        return normalizedContent;
    }

    private List<CommonFileVO> listOwnedApprovalCommentFiles(LoginVO user, Long commentId) throws Exception {
        List<CommonFileVO> files = commonFileService.listFiles(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId);
        return files == null ? Collections.<CommonFileVO>emptyList() : files;
    }

    private void requireOwnedApprovalCommentFile(LoginVO user, Long commentId, Long fileId) throws Exception {
        if (fileId == null || fileId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부파일 ID가 올바르지 않습니다.");
        }
        boolean ownedFileExists = listOwnedApprovalCommentFiles(user, commentId).stream()
                .anyMatch(file -> fileId.equals(file.getFileId())
                        && user.getTenantId().equals(file.getTenantId())
                        && COMMENT_FILE_OWNER_TYPE.equals(file.getOwnerType())
                        && commentId.equals(file.getOwnerId())
                        && "ATTACHMENT".equals(file.getFileUsageType()));
        if (!ownedFileExists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
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

    private void requireRelatedDocument(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        if (!Boolean.TRUE.equals(documentApprovalDAO.selectIsDocumentParticipant(params))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }
    }

    private Map<String, Object> actorParams(LoginVO user) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("drafterId", user.getId());
        params.put("drafterUserId", user.getUniqId());
        params.put("participantUserId", user.getUniqId());
        params.put("drafterName", user.getName());
        params.put("documentStatus", "DRAFT");
        return params;
    }

    private String normalizeText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private LocalDate parseOptionalDate(String value) {
        String normalizedValue = normalizeText(value);
        if (normalizedValue == null) {
            return null;
        }
        try {
            return LocalDate.parse(normalizedValue);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 날짜 조건이 올바르지 않습니다.");
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 날짜 범위가 올바르지 않습니다.");
        }
    }

    private DocumentApprovalDraftVO draftResponse(Long approvalId) {
        DocumentApprovalDraftVO response = workflowResponse(approvalId, "DRAFT");
        return response;
    }

    private DocumentApprovalDraftVO persistedDraftResponse(LoginVO user, Long approvalId) throws Exception {
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", approvalId);
        DocumentApprovalDraftVO response = documentApprovalDAO.selectDraftDocumentStatus(params);
        if (response == null) {
            throw new IllegalStateException("저장된 전자결재 문서 정보를 확인할 수 없습니다.");
        }
        return response;
    }

    private DocumentApprovalDraftVO workflowResponse(Long approvalId, String status) {
        DocumentApprovalDraftVO response = new DocumentApprovalDraftVO();
        response.setElectronicApprovalId(approvalId);
        response.setDocumentStatus(status);
        return response;
    }
}
