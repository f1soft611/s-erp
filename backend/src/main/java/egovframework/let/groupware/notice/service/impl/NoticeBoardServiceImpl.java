package egovframework.let.groupware.notice.service.impl;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.groupware.notice.service.NoticeBoardService;

@Service("noticeBoardService")
public class NoticeBoardServiceImpl extends EgovAbstractServiceImpl implements NoticeBoardService {

    private static final String BOARD_TYPE_NOTICE = "NOTICE";
    private static final String DEFAULT_BUCKET = "document-attachments";

    private final NoticeBoardDAO noticeBoardDAO;
    private final CommonFileService commonFileService;
    private final CommonCommentService commonCommentService;

    @Value("${storage.bucket:document-attachments}")
    private String storageBucket;

    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, CommonFileService commonFileService,
            CommonCommentService commonCommentService) {
        this.noticeBoardDAO = noticeBoardDAO;
        this.commonFileService = commonFileService;
        this.commonCommentService = commonCommentService;
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("keyword", StringUtils.hasText(keyword) ? keyword.trim() : null);
        params.put("offset", Math.max((page - 1) * size, 0));
        params.put("size", size);
        List<NoticeBoardPostVO> posts = noticeBoardDAO.selectNoticePostList(params);
        return posts == null ? new ArrayList<>() : posts;
    }

    @Override
    public NoticeBoardPostVO getPost(Long tenantId, Long postId) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        NoticeBoardPostVO post = noticeBoardDAO.selectNoticePostById(params);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }

        HashMap<String, Object> fileParams = new HashMap<>();
        fileParams.put("tenantId", tenantId);
        fileParams.put("postId", postId);
        List<NoticeBoardFileVO> files = noticeBoardDAO.selectNoticeAttachmentList(fileParams);
        post.setAttachments(files == null ? new ArrayList<>() : files);
        return post;
    }

    @Override
    @Transactional
    public NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        validateCreatePayload(payload);
        String contentsHtml = payload.getEffectiveContentsHtml();
        String contentsText = payload.getEffectiveContentsText();
        String contentsJson = payload.getEffectiveContentsJson();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("title", payload.getTitle().trim());
        params.put("contents", contentsHtml);
        params.put("contentsHtml", contentsHtml);
        params.put("contentsJson", contentsJson);
        params.put("contentsText", contentsText);
        params.put("writerId", StringUtils.hasText(payload.getWriterId()) ? payload.getWriterId() : "unknown");
        params.put("writerName", StringUtils.hasText(payload.getWriterName()) ? payload.getWriterName() : "관리자");
        params.put("isNotice", StringUtils.hasText(payload.getIsNotice()) ? payload.getIsNotice().toUpperCase() : "N");

        Long postId = noticeBoardDAO.insertNoticePost(params);
        if (payload.getAttachmentIds() != null && !payload.getAttachmentIds().isEmpty()) {
            for (Long fileId : payload.getAttachmentIds()) {
                HashMap<String, Object> attachParams = new HashMap<>();
                attachParams.put("tenantId", tenantId);
                attachParams.put("postId", postId);
                attachParams.put("boardFileId", fileId);
                noticeBoardDAO.selectNoticeAttachmentById(attachParams);
            }
        }

        return getPost(tenantId, postId);
    }

    @Override
    @Transactional
    public NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정 요청이 비어 있습니다.");
        }

        getPost(tenantId, postId);
        String contentsHtml = payload.getEffectiveContentsHtml();
        String contentsText = payload.getEffectiveContentsText();
        String contentsJson = payload.getEffectiveContentsJson();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("title", payload.getTitle() == null ? null : payload.getTitle().trim());
        params.put("contents", contentsHtml);
        params.put("contentsHtml", contentsHtml);
        params.put("contentsJson", contentsJson);
        params.put("contentsText", contentsText);
        params.put("writerName", payload.getWriterName());
        params.put("isNotice", StringUtils.hasText(payload.getIsNotice()) ? payload.getIsNotice().toUpperCase() : "N");
        noticeBoardDAO.updateNoticePost(params);
        return getPost(tenantId, postId);
    }

    @Override
    @Transactional
    public void deletePost(Long tenantId, Long postId) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        NoticeBoardPostVO existing = noticeBoardDAO.selectNoticePostById(params);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }
        noticeBoardDAO.softDeleteNoticePost(params);
    }

    @Override
    @Transactional
    public NoticeBoardFileVO uploadAttachment(Long tenantId, Long postId, MultipartFile file, String uploaderId) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }
        getPost(tenantId, postId);

        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }

        CommonFileVO uploaded = commonFileService.uploadFile(tenantId, "NOTICE", postId, file, uploaderId);
        if (uploaded == null || uploaded.getFileId() == null) {
            return null;
        }

        NoticeBoardFileVO noticeBoardFile = new NoticeBoardFileVO();
        noticeBoardFile.setBoardFileId(uploaded.getFileId());
        noticeBoardFile.setPostId(postId);
        noticeBoardFile.setFileName(uploaded.getFileName());
        noticeBoardFile.setFilePath(uploaded.getFilePath());
        noticeBoardFile.setObjectKey(uploaded.getObjectKey());
        noticeBoardFile.setBucketName(uploaded.getBucketName());
        noticeBoardFile.setStorageProvider(uploaded.getStorageProvider());
        noticeBoardFile.setFileSize(uploaded.getFileSize());
        noticeBoardFile.setMimeType(uploaded.getMimeType());
        noticeBoardFile.setContentType(uploaded.getContentType());
        noticeBoardFile.setDeletedYn(uploaded.getDeletedYn());
        noticeBoardFile.setUploadedBy(uploaded.getUploadedBy());
        noticeBoardFile.setCreatedAt(uploaded.getCreatedAt());
        noticeBoardFile.setUpdatedAt(uploaded.getUpdatedAt());
        return noticeBoardFile;
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long boardFileId) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        commonFileService.deleteFile(tenantId, boardFileId);
    }

    @Override
    public void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        commonFileService.downloadFile(tenantId, boardFileId, response);
    }

    private void validateCreatePayload(NoticeBoardPostSaveRequestVO payload) {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (!StringUtils.hasText(payload.getTitle())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목은 필수입니다.");
        }
        String contentsHtml = payload.getEffectiveContentsHtml();
        if (!StringUtils.hasText(contentsHtml)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내용은 필수입니다.");
        }
    }

}
