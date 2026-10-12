package egovframework.let.groupware.approval.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.service.DocumentApprovalService;

class DocumentApprovalApiControllerTest {

    private final DocumentApprovalService approvalService = mock(DocumentApprovalService.class);
    private final DocumentApprovalApiController controller =
            new DocumentApprovalApiController(new ResultVoHelper(), approvalService);

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

    private LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        user.setName("작성자");
        return user;
    }
}
