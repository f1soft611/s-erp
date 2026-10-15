package egovframework.let.groupware.approval.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateLineVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.ApprovalLineTemplateDAO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;

class ApprovalLineTemplateServiceImplTest {

    private final ApprovalLineTemplateDAO templateDAO = mock(ApprovalLineTemplateDAO.class);
    private final DocumentApprovalDAO documentApprovalDAO = mock(DocumentApprovalDAO.class);

    @Test
    void createStoresOrderedLinesForAuthenticatedOwnerAndTenant() throws Exception {
        LoginVO user = authenticatedUser();
        ApprovalLineTemplateSaveRequestVO request = request("001", "기본 결재선",
                line(2, 1, "APPROVAL", "201"),
                line(3, 1, "AGREEMENT", "202"),
                line(4, 1, "REFERENCE", "203"));
        when(templateDAO.selectOwnedTemplateNameExists(anyMap())).thenReturn(false);
        when(documentApprovalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
                participant("201"), participant("202"), participant("203")));
        when(templateDAO.insertTemplate(anyMap())).thenReturn(41L);
        when(templateDAO.insertTemplateLines(anyMap())).thenReturn(3);

        ApprovalLineTemplateVO saved = service().createTemplate(user, request);

        assertThat(saved.getTemplateId()).isEqualTo(41L);
        assertThat(saved.getEabusNo()).isEqualTo("001");
        assertThat(saved.getName()).isEqualTo("기본 결재선");
        verify(templateDAO).insertTemplate(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "login-author".equals(params.get("ownerUserId"))
                        && "001".equals(params.get("eabusNo"))
                        && "기본 결재선".equals(params.get("name"))));
        verify(documentApprovalDAO).selectActiveParticipants(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && params.get("participantUserIds").equals(Arrays.asList("201", "202", "203"))));
        verify(templateDAO).insertTemplateLines(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && Long.valueOf(41L).equals(params.get("templateId"))
                        && ((List<?>) params.get("approvalLines")).size() == 3));
    }

    @Test
    void rejectsUnsupportedDocumentCodeBeforeDatabaseAccess() throws Exception {
        ApprovalLineTemplateSaveRequestVO request = request("999", "기본 결재선");

        assertThatThrownBy(() -> service().createTemplate(authenticatedUser(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(templateDAO, never()).insertTemplate(anyMap());
    }

    private ApprovalLineTemplateServiceImpl service() {
        return new ApprovalLineTemplateServiceImpl(templateDAO, documentApprovalDAO);
    }

    private LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("employee-author");
        user.setName("작성자");
        return user;
    }

    private ApprovalLineTemplateSaveRequestVO request(String eabusNo, String name,
            ApprovalLineTemplateLineVO... lines) {
        ApprovalLineTemplateSaveRequestVO request = new ApprovalLineTemplateSaveRequestVO();
        request.setEabusNo(eabusNo);
        request.setName(name);
        request.setApprovalLines(Arrays.asList(lines));
        return request;
    }

    private ApprovalLineTemplateLineVO line(int stage, int order, String type, String userId) {
        ApprovalLineTemplateLineVO line = new ApprovalLineTemplateLineVO();
        line.setStageOrder(stage);
        line.setParticipantOrder(order);
        line.setParticipantType(type);
        line.setParticipantUserId(userId);
        return line;
    }

    private DocumentApprovalParticipantVO participant(String userId) {
        DocumentApprovalParticipantVO participant = new DocumentApprovalParticipantVO();
        participant.setUserId(userId);
        participant.setUserName("사용자 " + userId);
        return participant;
    }
}
