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

import egovframework.let.groupware.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.groupware.notice.service.NoticeBoardService;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;

@Service("noticeBoardService")
public class NoticeBoardServiceImpl extends EgovAbstractServiceImpl implements NoticeBoardService {

    private static final String BOARD_TYPE_NOTICE = "NOTICE";
    private static final String DEFAULT_BUCKET = "document-attachments";

    private final NoticeBoardDAO noticeBoardDAO;
    private final MinioClient minioClient;

    @Value("${storage.bucket:document-attachments}")
    private String storageBucket;

    @Value("${storage.endpoint:http://218.155.74.34:9000}")
    private String storageEndpoint;

    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, MinioClient minioClient) {
        this.noticeBoardDAO = noticeBoardDAO;
        this.minioClient = minioClient;
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

        String originalName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!StringUtils.hasText(originalName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드 파일명이 없습니다.");
        }

        String normalizedName = originalName.replace("\\", "/");
        String objectKey = "tenant/" + tenantId + "/notice/" + postId + "/" + normalizedName;
        String bucketName = StringUtils.hasText(this.storageBucket) ? this.storageBucket : DEFAULT_BUCKET;
        ensureBucketExists(bucketName);

        try {
            String sha256 = sha256(file.getBytes());
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("postId", postId);
            params.put("fileName", normalizedName);
            params.put("filePath", objectKey);
            params.put("objectKey", objectKey);
            params.put("bucketName", bucketName);
            params.put("storageProvider", "minio");
            params.put("fileSize", file.getSize());
            params.put("mimeType", file.getContentType());
            params.put("checksumSha256", sha256);
            params.put("contentType", file.getContentType());
            params.put("uploadedBy", uploaderId == null ? "unknown" : uploaderId);
            params.put("deletedYn", "N");

            Long boardFileId = noticeBoardDAO.insertNoticeAttachment(params);
            HashMap<String, Object> lookup = new HashMap<>();
            lookup.put("tenantId", tenantId);
            lookup.put("boardFileId", boardFileId);
            return noticeBoardDAO.selectNoticeAttachmentById(lookup);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MinIO 업로드 중 오류가 발생했습니다.");
        }
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long boardFileId) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardFileId", boardFileId);

        NoticeBoardFileVO attachment = noticeBoardDAO.selectNoticeAttachmentById(params);
        if (attachment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }

        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(attachment.getBucketName())
                    .object(attachment.getObjectKey())
                    .build());
        } catch (Exception ignored) {
            // MinIO 삭제 실패는 DB soft-delete로 보완한다.
        }

        noticeBoardDAO.softDeleteNoticeAttachment(params);
    }

    @Override
    public void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardFileId", boardFileId);
        NoticeBoardFileVO attachment = noticeBoardDAO.selectNoticeAttachmentById(params);
        if (attachment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }

        String bucketName = StringUtils.hasText(attachment.getBucketName()) ? attachment.getBucketName() : DEFAULT_BUCKET;
        String objectKey = attachment.getObjectKey();
        if (!StringUtils.hasText(objectKey)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 경로가 없습니다.");
        }

        response.setContentType(StringUtils.hasText(attachment.getMimeType()) ? attachment.getMimeType() : "application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + attachment.getFileName() + "\"");
        if (attachment.getFileSize() != null) {
            response.setContentLengthLong(attachment.getFileSize());
        }

        try (GetObjectResponse inputStream = minioClient.getObject(GetObjectArgs.builder()
                .bucket(bucketName)
                .object(objectKey)
                .build());
             ServletOutputStream outputStream = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            outputStream.flush();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 다운로드 중 오류가 발생했습니다.");
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
    }

    private void ensureBucketExists(String bucketName) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    private String sha256(byte[] bytes) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(bytes);
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
