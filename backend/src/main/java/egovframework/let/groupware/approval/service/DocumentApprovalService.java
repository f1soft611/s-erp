package egovframework.let.groupware.approval.service;

import java.util.List;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;

public interface DocumentApprovalService {

    DocumentApprovalDraftVO saveDraft(LoginVO user, DocumentApprovalDraftSaveRequestVO request) throws Exception;
    DocumentApprovalDraftVO saveDraft(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception;
    DocumentApprovalDraftVO submit(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception;
    DocumentApprovalDraftVO processAction(LoginVO user, Long electronicApprovalId,
            DocumentApprovalActionRequestVO request) throws Exception;
    List<DocumentApprovalListItemVO> listDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception;
    DocumentApprovalSummaryVO getSummary(LoginVO user) throws Exception;
    DocumentApprovalDetailVO getDetail(LoginVO user, Long electronicApprovalId) throws Exception;
    List<CommonFileVO> listAttachments(LoginVO user, Long electronicApprovalId) throws Exception;
    CommonFileVO uploadAttachment(LoginVO user, Long electronicApprovalId, MultipartFile file) throws Exception;
    void deleteAttachment(LoginVO user, Long electronicApprovalId, Long fileId) throws Exception;
    void downloadAttachment(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception;
    EmbeddedImageUploadVO uploadTemporaryEmbeddedImage(LoginVO user, MultipartFile file) throws Exception;
    void deleteTemporaryEmbeddedImage(LoginVO user, String uploadToken, String fileName) throws Exception;
    void streamEmbeddedImage(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception;
}
