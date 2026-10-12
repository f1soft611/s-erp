package egovframework.let.groupware.approval.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
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
}
