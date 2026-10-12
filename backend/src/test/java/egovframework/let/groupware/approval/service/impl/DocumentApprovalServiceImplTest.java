package egovframework.let.groupware.approval.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;

class DocumentApprovalServiceImplTest {

    private final DocumentApprovalDAO approvalDAO = mock(DocumentApprovalDAO.class);
    private final CommonCommentDAO commentDAO = mock(CommonCommentDAO.class);
    private final CommonFileService fileService = mock(CommonFileService.class);
    private final RichTextDocumentSanitizer documentSanitizer = new RichTextDocumentSanitizer();
    private final LoginVO author = author();

    @Test
    void saveDraftPersistsAuthenticatedAuthorOrderedLinesAndSystemEvent() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        DocumentApprovalDraftVO saved = service().saveDraft(author, request());

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(saved.getDocumentStatus()).isEqualTo("DRAFT");

        ArgumentCaptor<Map<String, Object>> documentParams = mapCaptor();
        verify(approvalDAO).insertDocumentApprovalMain(documentParams.capture());
        assertThat(documentParams.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("drafterId", "login-author")
            .containsEntry("drafterName", "작성자")
            .containsEntry("drafterDepartmentName", "기획팀")
            .containsEntry("documentStatus", "DRAFT")
            .containsEntry("documentType", "DRAFTING")
            .containsEntry("title", "기안 요청")
            .containsEntry("contentsHtml", "<p>본문</p>")
            .containsEntry("contentsText", "본문");

        ArgumentCaptor<Map<String, Object>> lineParams = mapCaptor();
        verify(approvalDAO, org.mockito.Mockito.times(2)).insertDocumentApprovalLine(lineParams.capture());
        assertThat(lineParams.getAllValues())
            .extracting(params -> params.get("participantUserId"))
            .containsExactly("101", "202");
        assertThat(lineParams.getAllValues())
            .extracting(params -> params.get("participantName"))
            .containsExactly("작성자", "결재자");

        ArgumentCaptor<Map<String, Object>> eventParams = mapCaptor();
        verify(commentDAO).insertSystemComment(eventParams.capture());
        assertThat(eventParams.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("ownerType", "APPROVAL")
            .containsEntry("ownerId", 77L)
            .containsEntry("commentType", "SYSTEM")
            .containsEntry("eventType", "DRAFT_SAVED")
            .containsEntry("writerId", "login-author")
            .containsEntry("writerName", "작성자");
    }

    @Test
    void saveDraftRejectsInvalidParticipantBeforeWritingAnything() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap()))
            .thenReturn(Collections.singletonList(participant("101", "작성자", "기획팀")));
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setApprovalLines(new ArrayList<>(request.getApprovalLines()));
        request.getApprovalLines().add(line(2, 1, "APPROVAL", "999"));

        assertThatThrownBy(() -> service().saveDraft(author, request))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftUsesConditionalUpdateForExistingDraft() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("login-author");
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.deleteDocumentApprovalLines(anyMap())).thenReturn(2);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(92L);

        DocumentApprovalDraftVO saved = service().saveDraft(author, 77L, request());

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
        verify(approvalDAO).updateDocumentApprovalMain(org.mockito.ArgumentMatchers.argThat(
            params -> params.get("tenantId").equals(4L)
                && params.get("drafterId").equals("login-author")
                && params.get("documentStatus").equals("DRAFT")
                && params.get("electronicApprovalId").equals(77L)));
        verify(commentDAO).insertSystemComment(org.mockito.ArgumentMatchers.argThat(
            params -> params.get("ownerId").equals(77L)
                && params.get("eventType").equals("DRAFT_SAVED")));
    }

    @Test
    void saveDraftStopsWhenAnApprovalLineCannotBePersisted() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> service().saveDraft(author, request()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("결재선 저장에 실패했습니다.");
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftFailsWhenSystemEventPersistenceReturnsNoIdentity() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service().saveDraft(author, request()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("임시저장 시스템 이력 기록에 실패했습니다.");
    }

    @Test
    void saveDraftRejectsUpdatingAnotherAuthorsDraft() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("other-login");

        assertThatThrownBy(() -> service().saveDraft(author, 77L, request()))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(approvalDAO, never()).deleteDocumentApprovalLines(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftRequiresTransactionalBoundary() throws Exception {
        Method method = DocumentApprovalServiceImpl.class.getMethod(
            "saveDraft", LoginVO.class, Long.class, DocumentApprovalDraftSaveRequestVO.class);

        assertThat(method.getAnnotation(Transactional.class)).isNotNull();
    }

    @Test
    void attachmentsAreUnavailableToAnotherDraftAuthor() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("other-login");

        assertThatThrownBy(() -> service().listAttachments(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(fileService);
    }

    private DocumentApprovalServiceImpl service() {
        return new DocumentApprovalServiceImpl(approvalDAO, commentDAO, fileService, documentSanitizer);
    }

    private DocumentApprovalDraftSaveRequestVO request() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = new DocumentApprovalDraftSaveRequestVO();
        request.setDocumentType("DRAFTING");
        request.setTitle("기안 요청");
        request.setContentsJson(new ObjectMapper().readTree("{\"type\":\"doc\",\"content\":[]}"));
        request.setContentsHtml("<script>unsafe()</script><p>본문</p>");
        request.setContentsText("본문");
        request.setApprovalLines(Arrays.asList(
            line(1, 1, "APPROVAL", "101"),
            line(2, 1, "AGREEMENT", "202")));
        return request;
    }

    private DocumentApprovalDraftSaveRequestVO.ApprovalLineVO line(
            int stageOrder, int participantOrder, String participantType, String participantUserId) {
        DocumentApprovalDraftSaveRequestVO.ApprovalLineVO line =
            new DocumentApprovalDraftSaveRequestVO.ApprovalLineVO();
        line.setStageOrder(stageOrder);
        line.setParticipantOrder(participantOrder);
        line.setParticipantType(participantType);
        line.setParticipantUserId(participantUserId);
        return line;
    }

    private DocumentApprovalParticipantVO participant(String userId, String name, String departmentName) {
        DocumentApprovalParticipantVO participant = new DocumentApprovalParticipantVO();
        participant.setUserId(userId);
        participant.setUserName(name);
        participant.setDepartmentName(departmentName);
        return participant;
    }

    private LoginVO author() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        user.setName("작성자");
        user.setDepartmentName("기획팀");
        return user;
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
    }
}
