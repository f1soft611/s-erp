package egovframework.let.groupware.approval.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.servlet.http.HttpServletResponse;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWritePageVO;
import egovframework.let.groupware.approval.service.DocumentApprovalService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;

class DocumentApprovalApiControllerTest {

    private final DocumentApprovalService approvalService = mock(DocumentApprovalService.class);
    private final DocumentApprovalApiController controller =
            new DocumentApprovalApiController(new ResultVoHelper(), approvalService);

    @Test
    void filePageUsesAuthenticatedUserAndExistingResultEnvelope() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalFilePageVO page = new DocumentApprovalFilePageVO();
        page.setResultList(Collections.emptyList());
        when(approvalService.listFiles(user, "ALL", null, null, 55L)).thenReturn(page);
        ResultVO response = controller.listFiles("ALL", null, null, 55L, user);
        assertThat(response.getResult())
                .containsEntry("resultList", page.getResultList())
                .containsEntry("hasNext", false)
                .containsEntry("nextBeforeFileId", null);
        Method method = DocumentApprovalApiController.class.getMethod("listFiles",
                String.class, String.class, Long.class, Long.class, LoginVO.class);
        assertThat(method.getAnnotation(GetMapping.class).value()).containsExactly("/files");
        verify(approvalService).listFiles(user, "ALL", null, null, 55L);
    }

    @Test
    void listDocumentsKeepsLightweightResponseByDefault() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO listItem = new DocumentApprovalListItemVO();
        listItem.setElectronicApprovalId(77L);
        List<DocumentApprovalListItemVO> list = Collections.singletonList(listItem);
        when(approvalService.listDocuments(user, "ALL", null, null)).thenReturn(list);

        ResultVO response = controller.listDocuments(
                "ALL", null, false, new DocumentApprovalListQueryVO(), user);

        assertThat(response.getResult().get("resultList")).isSameAs(list);
        assertThat(response.getResult()).doesNotContainKey("totalRowCount");
        verify(approvalService).listDocuments(user, "ALL", null, null);
    }

    @Test
    void listDocumentsReturnsDetailedRowsWhenRequested() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalFeedItemVO feedItem = new DocumentApprovalFeedItemVO();
        feedItem.setElectronicApprovalId(77L);
        List<DocumentApprovalFeedItemVO> feed = Collections.singletonList(feedItem);
        when(approvalService.listFeedDocuments(user, "ALL", null, null)).thenReturn(feed);

        ResultVO response = controller.listDocuments(
                "ALL", null, true, new DocumentApprovalListQueryVO(), user);

        assertThat(response.getResult().get("resultList")).isSameAs(feed);
        assertThat(response.getResult()).doesNotContainKey("totalRowCount");
        verify(approvalService).listFeedDocuments(user, "ALL", null, null);
    }

    @Test
    void listDocumentsReturnsResultListAndTotalForRemoteQuery() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO row = new DocumentApprovalListItemVO();
        row.setElectronicApprovalId(77L);
        DocumentApprovalWritePageVO<DocumentApprovalListItemVO> page = new DocumentApprovalWritePageVO<>();
        page.setResultList(Collections.singletonList(row));
        page.setTotalRowCount(42L);
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setOffset(0);
        query.setLimit(25);
        when(approvalService.searchWriteDocuments(user, "ALL", query)).thenReturn(page);

        ResultVO response = controller.listDocuments("ALL", null, false, query, user);

        assertThat(response.getResult())
                .containsEntry("resultList", page.getResultList())
                .containsEntry("totalRowCount", 42L);
        verify(approvalService).searchWriteDocuments(user, "ALL", query);
    }

    @Test
    void pinAndUnpinRoutesDelegateAuthenticatedActorAndReturnStateItem() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalPinStateVO pinned = new DocumentApprovalPinStateVO();
        pinned.setElectronicApprovalId(77L);
        pinned.setPinned(true);
        DocumentApprovalPinStateVO unpinned = new DocumentApprovalPinStateVO();
        unpinned.setElectronicApprovalId(77L);
        unpinned.setPinned(false);
        when(approvalService.pinDocument(user, 77L)).thenReturn(pinned);
        when(approvalService.unpinDocument(user, 77L)).thenReturn(unpinned);

        assertRoute("pinDocument", PutMapping.class, "/documents/{electronicApprovalId}/pin");
        assertRoute("unpinDocument", DeleteMapping.class, "/documents/{electronicApprovalId}/pin");

        ResultVO pinResponse = controller.pinDocument(77L, user);
        ResultVO unpinResponse = controller.unpinDocument(77L, user);

        assertThat(pinResponse.getResult().get("item")).isSameAs(pinned);
        assertThat(unpinResponse.getResult().get("item")).isSameAs(unpinned);
        verify(approvalService).pinDocument(user, 77L);
        verify(approvalService).unpinDocument(user, 77L);
    }

    @Test
    void listPinnedDocumentsReturnsFilteredListAndTotalCount() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO pinned = new DocumentApprovalListItemVO();
        pinned.setElectronicApprovalId(77L);
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setDocumentType("DRAFTING");
        when(approvalService.listPinnedDocuments(user, "MY_PENDING", "DRAFTING", 77L))
                .thenReturn(Collections.singletonList(pinned));

        ResultVO response = controller.listPinnedDocuments("MY_PENDING", 77L, false, query, user);

        assertRoute("listPinnedDocuments", GetMapping.class, "/documents/pinned");
        assertThat(response.getResult())
                .containsEntry("resultList", Collections.singletonList(pinned))
                .containsEntry("totalRowCount", 1L);
        verify(approvalService).listPinnedDocuments(user, "MY_PENDING", "DRAFTING", 77L);
    }

    @Test
    void listDocumentsBindsRemoteSearchFiltersAndReturnsPageMetadata() throws Exception {
        DocumentApprovalStatusListItemVO row = new DocumentApprovalStatusListItemVO();
        row.setElectronicApprovalId(77L);
        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(Collections.singletonList(row));
        page.setTotalRowCount(42L);
        when(approvalService.searchDocuments(any(LoginVO.class), eq("ALL"), any(DocumentApprovalListQueryVO.class)))
                .thenReturn(page);

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        assertRoute("searchDocuments", GetMapping.class, "/documents/search");
        mockMvc.perform(get("/api/v1/groupware/approvals/documents/search")
                .param("keyword", "annual")
                .param("documentType", "DRAFTING")
                .param("documentStatus", "COMPLETED")
                .param("submittedAtFrom", "2026-09-16")
                .param("submittedAtTo", "2026-10-16")
                .param("drafterName", "Morgan")
                .param("drafterDepartmentName", "Finance")
                .param("participantName", "Sam")
                .param("updatedAtFrom", "2026-10-01")
                .param("updatedAtTo", "2026-10-16")
                .param("offset", "0")
                .param("limit", "25")
                .param("sortField", "submittedAt")
                .param("sortDirection", "ASC"))
                .andExpect(status().isOk());

        verify(approvalService).searchDocuments(any(LoginVO.class), eq("ALL"), argThat(query ->
            "annual".equals(query.getKeyword())
                && "DRAFTING".equals(query.getDocumentType())
                && "COMPLETED".equals(query.getDocumentStatus())
                && "2026-09-16".equals(query.getSubmittedAtFrom())
                && "2026-10-16".equals(query.getSubmittedAtTo())
                && "Morgan".equals(query.getDrafterName())
                && "Finance".equals(query.getDrafterDepartmentName())
                && "Sam".equals(query.getParticipantName())
                && "2026-10-01".equals(query.getUpdatedAtFrom())
                && "2026-10-16".equals(query.getUpdatedAtTo())
                && Integer.valueOf(0).equals(query.getOffset())
                && Integer.valueOf(25).equals(query.getLimit())
                && "submittedAt".equals(query.getSortField())
                && "ASC".equals(query.getSortDirection())));
    }

    @Test
    void listApprovalCommentsReturnsTheUnifiedPageContract() throws Exception {
        LoginVO user = authenticatedUser();
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(104L);
        CommonCommentVO systemEvent = new CommonCommentVO();
        systemEvent.setCommentId(103L);
        DocumentApprovalCommentPageVO page = new DocumentApprovalCommentPageVO();
        page.setComments(Collections.singletonList(comment));
        page.setSystemEvents(Collections.singletonList(systemEvent));
        page.setResultCnt(4L);
        page.setHasPrevious(true);
        page.setNextBeforeCommentId(103L);
        when(approvalService.listApprovalComments(user, 77L, 3, 103L)).thenReturn(page);

        ResultVO response = controller.listApprovalComments(77L, 3, 103L, user);

        assertThat(response.getResult())
            .containsEntry("resultList", page.getComments())
            .containsEntry("comments", page.getComments())
            .containsEntry("systemEvents", page.getSystemEvents())
            .containsEntry("resultCnt", 4L)
            .containsEntry("hasPrevious", true)
            .containsEntry("nextBeforeCommentId", 103L);
        verify(approvalService).listApprovalComments(user, 77L, 3, 103L);
    }

    @Test
    void createDraftReturnsCreatedDocumentIdentity() throws Exception {
        LoginVO user = new LoginVO();
        DocumentApprovalDraftSaveRequestVO request = new DocumentApprovalDraftSaveRequestVO();
        DocumentApprovalDraftVO saved = new DocumentApprovalDraftVO();
        saved.setElectronicApprovalId(77L);
        saved.setDocumentStatus("DRAFT");
        when(approvalService.saveDraft(user, request)).thenReturn(saved);

        ResponseEntity<ResultVO> response = controller.createDraft(request, user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        DocumentApprovalDraftVO item = (DocumentApprovalDraftVO) response.getBody().getResult().get("item");
        assertThat(item.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(item.getDocumentStatus()).isEqualTo("DRAFT");
        verify(approvalService).saveDraft(user, request);
    }

    @Test
    void submitRouteReturnsCreatedResponse() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        mockMvc.perform(post("/api/v1/groupware/approvals/77/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void uploadTemporaryEmbeddedImageReturnsCreatedItem() throws Exception {
        LoginVO user = authenticatedUser();
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", new byte[] {1, 2, 3});
        EmbeddedImageUploadVO uploaded = new EmbeddedImageUploadVO();
        uploaded.setUploadToken("token");
        uploaded.setFileName("image.png");
        when(approvalService.uploadTemporaryEmbeddedImage(user, file)).thenReturn(uploaded);

        ResponseEntity<ResultVO> response = controller.uploadTemporaryEmbeddedImage(file, user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getResult().get("item")).isSameAs(uploaded);
        verify(approvalService).uploadTemporaryEmbeddedImage(user, file);
    }

    @Test
    void deleteTemporaryEmbeddedImageDelegatesTokenAndFileName() throws Exception {
        LoginVO user = authenticatedUser();

        controller.deleteTemporaryEmbeddedImage("token", "image.png", user);

        verify(approvalService).deleteTemporaryEmbeddedImage(user, "token", "image.png");
    }

    @Test
    void streamEmbeddedImageDelegatesApprovalAndFileIdentity() throws Exception {
        LoginVO user = authenticatedUser();
        HttpServletResponse response = mock(HttpServletResponse.class);

        controller.streamEmbeddedImage(77L, 91L, user, response);

        verify(approvalService).streamEmbeddedImage(user, 77L, 91L, response);
    }

    @Test
    void numericImageWidthCanBeReadIntoStringMetadata() throws Exception {
        DocumentApprovalEmbeddedImageVO image = new ObjectMapper().readValue(
                "{\"width\":320}",
                DocumentApprovalEmbeddedImageVO.class);

        assertThat(image.getWidth()).isEqualTo("320");
    }

    @Test
    void approvalCommentAndAttachmentRoutesIncludeApprovalAndCommentIds() {
        assertRoute("listApprovalComments", GetMapping.class, "/{electronicApprovalId}/comments");
        assertRoute("createApprovalComment", PostMapping.class, "/{electronicApprovalId}/comments");
        assertRoute("updateApprovalComment", PutMapping.class,
                "/{electronicApprovalId}/comments/{commentId}");
        assertRoute("deleteApprovalComment", DeleteMapping.class,
                "/{electronicApprovalId}/comments/{commentId}");
        assertRoute("listApprovalCommentAttachments", GetMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments");
        assertRoute("uploadApprovalCommentAttachment", PostMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments");
        assertRoute("downloadApprovalCommentAttachment", GetMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}/download");
        assertRoute("deleteApprovalCommentAttachment", DeleteMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}");
    }

    @Test
    void documentDeleteRouteIsAvailableAtApprovalRoot() {
        assertRoute("deleteDocumentApproval", DeleteMapping.class, "/{electronicApprovalId}");
    }

    @Test
    void cancellationRoutesDelegateAndReturnWorkflowItems() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalDraftVO submission = new DocumentApprovalDraftVO();
        submission.setElectronicApprovalId(77L);
        submission.setDocumentStatus("DRAFT");
        DocumentApprovalDraftVO approval = new DocumentApprovalDraftVO();
        approval.setElectronicApprovalId(77L);
        approval.setDocumentStatus("IN_PROGRESS");
        when(approvalService.cancelSubmission(user, 77L)).thenReturn(submission);
        when(approvalService.cancelApproval(user, 77L)).thenReturn(approval);

        assertRoute("cancelSubmission", PostMapping.class, "/{electronicApprovalId}/submission-cancellation");
        assertRoute("cancelApproval", PostMapping.class, "/{electronicApprovalId}/approval-cancellation");

        ResultVO submissionResponse = controller.cancelSubmission(77L, user);
        ResultVO approvalResponse = controller.cancelApproval(77L, user);

        assertThat(submissionResponse.getResult().get("item")).isSameAs(submission);
        assertThat(approvalResponse.getResult().get("item")).isSameAs(approval);
        verify(approvalService).cancelSubmission(user, 77L);
        verify(approvalService).cancelApproval(user, 77L);
    }

    private void assertRoute(String methodName, Class<? extends Annotation> mappingType, String expectedPath) {
        Method method = Arrays.stream(DocumentApprovalApiController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElse(null);
        assertThat(method).as("controller method %s exists", methodName).isNotNull();
        Annotation mapping = method.getAnnotation(mappingType);
        assertThat(mapping).as("%s has %s", methodName, mappingType.getSimpleName()).isNotNull();
        String[] paths;
        if (mapping instanceof GetMapping) {
            paths = ((GetMapping) mapping).value();
        } else if (mapping instanceof PostMapping) {
            paths = ((PostMapping) mapping).value();
        } else if (mapping instanceof PutMapping) {
            paths = ((PutMapping) mapping).value();
        } else {
            paths = ((DeleteMapping) mapping).value();
        }
        assertThat(paths).contains(expectedPath);
    }

    private LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        user.setName("작성자");
        return user;
    }
}
