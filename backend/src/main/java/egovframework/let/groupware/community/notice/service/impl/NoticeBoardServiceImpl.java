package egovframework.let.groupware.community.notice.service.impl;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.groupware.community.notice.service.NoticeBoardService;

@Service("noticeBoardService")
public class NoticeBoardServiceImpl extends EgovAbstractServiceImpl implements NoticeBoardService {

    private static final String BOARD_TYPE_NOTICE = "NOTICE";

    private final NoticeBoardDAO noticeBoardDAO;
    private final CommonFileService commonFileService;
    private final CommonCommentService commonCommentService;

    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, CommonFileService commonFileService,
            CommonCommentService commonCommentService) {
        this.noticeBoardDAO = noticeBoardDAO;
        this.commonFileService = commonFileService;
        this.commonCommentService = commonCommentService;
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size) throws Exception {
        return listPosts(tenantId, keyword, page, size, null);
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size, String noticeGubunCode) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("keyword", StringUtils.hasText(keyword) ? keyword.trim() : null);
        params.put("noticeGubunCode", StringUtils.hasText(noticeGubunCode) ? noticeGubunCode.trim() : null);
        params.put("offset", Math.max((page - 1) * size, 0));
        params.put("size", size);
        List<NoticeBoardPostVO> posts = noticeBoardDAO.selectNoticePostList(params);
        if (posts == null) {
            return new ArrayList<>();
        }
        for (NoticeBoardPostVO post : posts) {
            hydratePost(tenantId, post, post.getPostId());
        }
        return posts;
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

        hydratePost(tenantId, post, postId);
        return post;
    }

    private void hydratePost(Long tenantId, NoticeBoardPostVO post, Long postId) throws Exception {
        List<CommonFileVO> commonFiles = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        List<NoticeBoardFileVO> files = new ArrayList<>();
        if (commonFiles != null) {
            for (CommonFileVO commonFile : commonFiles) {
                files.add(toNoticeBoardFile(commonFile));
            }
        }
        HashMap<String, Object> boardFileParams = new HashMap<>();
        boardFileParams.put("postId", postId);
        List<NoticeBoardFileVO> embeddedFiles = noticeBoardDAO.selectNoticeAttachmentList(boardFileParams);
        if (embeddedFiles != null) {
            files.addAll(embeddedFiles);
        }
        post.setAttachments(files);
        post.setAttachmentCount(files.size());

        CommonCommentPageVO commentPage = commonCommentService.listComments(
            tenantId, BOARD_TYPE_NOTICE, postId, 3, null);
        List<CommonCommentVO> comments = commentPage == null || commentPage.getComments() == null
            ? new ArrayList<>() : commentPage.getComments();
        for (CommonCommentVO comment : comments) {
            if (comment.getCommentId() == null) {
                comment.setAttachments(new ArrayList<>());
                continue;
            }
            List<CommonFileVO> commentFiles = commonFileService.listFiles(
                tenantId, "NOTICE_COMMENT", comment.getCommentId());
            comment.setAttachments(commentFiles == null ? new ArrayList<>() : commentFiles);
        }
        post.setComments(comments);
        post.setHasPreviousComments(commentPage != null && commentPage.isHasPrevious());
        post.setNextBeforeCommentId(commentPage == null ? null : commentPage.getNextBeforeCommentId());
        post.setCommentCount(Math.toIntExact(
            commonCommentService.countComments(tenantId, BOARD_TYPE_NOTICE, postId)));
    }

    @Override
    @Transactional
    public NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        return createPost(tenantId, payload, null, null);
        }

        @Override
        @Transactional
        public NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload,
            String actorId, String actorName) throws Exception {
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
        params.put("writerId", actorId);
        params.put("writerName", actorName);
        params.put("noticeGubunCode", payload.getNoticeGubunCode() == null ? null : payload.getNoticeGubunCode().trim());
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
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
        persistEmbeddedImages(tenantId, postId, payload.getEmbeddedImages(), payload.getWriterId());

        return getPost(tenantId, postId);
    }

    @Override
    @Transactional
    public NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        return updatePost(tenantId, postId, payload, null, null);
        }

        @Override
        @Transactional
        public NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload,
            String actorId, String actorName) throws Exception {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정 요청이 비어 있습니다.");
        }

        HashMap<String, Object> existingParams = new HashMap<>();
        existingParams.put("tenantId", tenantId);
        existingParams.put("postId", postId);
        if (noticeBoardDAO.selectNoticePostById(existingParams) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }
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
        params.put("noticeGubunCode", payload.getNoticeGubunCode() == null ? null : payload.getNoticeGubunCode().trim());
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        params.put("isNotice", StringUtils.hasText(payload.getIsNotice()) ? payload.getIsNotice().toUpperCase() : "N");
        noticeBoardDAO.updateNoticePost(params);
        noticeBoardDAO.softDeleteEmbeddedNoticeAttachments(existingParams);
        persistEmbeddedImages(tenantId, postId, payload.getEmbeddedImages(), payload.getWriterId());
        return getPost(tenantId, postId);
    }

    private void persistEmbeddedImages(Long tenantId, Long postId, List<NoticeEmbeddedImageVO> images, String uploaderId)
            throws Exception {
        if (images == null) {
            return;
        }
        for (NoticeEmbeddedImageVO image : images) {
            if (image == null || !StringUtils.hasText(image.getObjectKey())
                    || !StringUtils.hasText(image.getFileName())
                    || !StringUtils.hasText(image.getUploadToken())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 정보가 올바르지 않습니다.");
            }
            String expectedPrefix = "tenant/" + tenantId + "/notice-temp/" + image.getUploadToken() + "/";
            if (!image.getObjectKey().startsWith(expectedPrefix)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 업로드 소유 정보가 올바르지 않습니다.");
            }
            HashMap<String, Object> params = new HashMap<>();
            params.put("postId", postId);
            params.put("fileName", image.getFileName());
            params.put("filePath", "minio://" + image.getBucketName() + "/" + image.getObjectKey());
            params.put("objectKey", image.getObjectKey());
            params.put("bucketName", image.getBucketName());
            params.put("storageProvider", "minio");
            params.put("fileSize", image.getFileSize() == null ? 0L : image.getFileSize());
            params.put("mimeType", image.getMimeType());
            params.put("contentType", image.getMimeType());
            params.put("fileUsageType", "EMBEDDED");
            params.put("deletedYn", "N");
            params.put("uploadedBy", StringUtils.hasText(uploaderId) ? uploaderId : "unknown");
            noticeBoardDAO.insertNoticeAttachment(params);
        }
    }

    @Override
    @Transactional
    public void deletePost(Long tenantId, Long postId) throws Exception {
        deletePost(tenantId, postId, null, null);
    }

    @Override
    @Transactional
    public void deletePost(Long tenantId, Long postId, String actorId, String actorName) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        NoticeBoardPostVO existing = noticeBoardDAO.selectNoticePostById(params);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        List<CommonFileVO> attachments = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        if (attachments != null) {
            for (CommonFileVO attachment : attachments) {
                if (attachment.getFileId() != null) {
                    commonFileService.deleteFile(tenantId, BOARD_TYPE_NOTICE, postId, attachment.getFileId());
                }
            }
        }
        noticeBoardDAO.softDeleteEmbeddedNoticeAttachments(params);
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

        return toNoticeBoardFile(uploaded);
    }

    private NoticeBoardFileVO toNoticeBoardFile(CommonFileVO source) {
        NoticeBoardFileVO target = new NoticeBoardFileVO();
        target.setBoardFileId(source.getFileId());
        target.setPostId(source.getOwnerId());
        target.setFileName(source.getFileName());
        target.setFilePath(source.getFilePath());
        target.setObjectKey(source.getObjectKey());
        target.setBucketName(source.getBucketName());
        target.setStorageProvider(source.getStorageProvider());
        target.setFileSize(source.getFileSize());
        target.setMimeType(source.getMimeType());
        target.setContentType(source.getContentType());
        target.setFileUsageType("ATTACHMENT");
        target.setDeletedYn(source.getDeletedYn());
        target.setUploadedBy(source.getUploadedBy());
        target.setCreatedAt(source.getCreatedAt());
        target.setUpdatedAt(source.getUpdatedAt());
        return target;
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long boardFileId) throws Exception {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        validateNoticeAttachment(tenantId, postId, boardFileId);
        commonFileService.deleteFile(tenantId, BOARD_TYPE_NOTICE, postId, boardFileId);
    }

    @Override
    public void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
    }

    @Override
    public void downloadAttachment(Long tenantId, Long postId, Long boardFileId, HttpServletResponse response) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        validateNoticeAttachment(tenantId, postId, boardFileId);
        commonFileService.downloadFile(tenantId, BOARD_TYPE_NOTICE, postId, boardFileId, response);
    }

    private void validateNoticeAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception {
        if (postId == null || boardFileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
        }
        List<CommonFileVO> files = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        boolean owned = files != null && files.stream()
            .anyMatch(file -> Objects.equals(file.getFileId(), boardFileId));
        if (!owned) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항 첨부파일을 찾을 수 없습니다.");
        }
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
        if (!StringUtils.hasText(payload.getNoticeGubunCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지 구분은 필수입니다.");
        }
    }

}
