package egovframework.com.attachment.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.attachment.domain.model.AttachmentFileVO;

public interface AttachmentService {

    List<AttachmentFileVO> listAttachments(Long tenantId, String ownerType, Long ownerId) throws Exception;

    AttachmentFileVO uploadAttachment(Long tenantId, String ownerType, Long ownerId, MultipartFile file, String uploaderId) throws Exception;

    void deleteAttachment(Long tenantId, Long attachmentId) throws Exception;

    void downloadAttachment(Long tenantId, Long attachmentId, javax.servlet.http.HttpServletResponse response) throws Exception;
}
