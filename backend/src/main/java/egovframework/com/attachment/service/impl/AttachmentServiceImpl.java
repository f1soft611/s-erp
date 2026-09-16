package egovframework.com.attachment.service.impl;

import java.io.IOException;
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

import egovframework.com.attachment.domain.model.AttachmentFileVO;
import egovframework.com.attachment.service.AttachmentService;
import egovframework.com.cmm.service.MinioStorageService;
import egovframework.let.groupware.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.notice.domain.repository.NoticeBoardDAO;

@Service("attachmentService")
public class AttachmentServiceImpl extends EgovAbstractServiceImpl implements AttachmentService {

    private static final String DEFAULT_BUCKET = "document-attachments";

    private final NoticeBoardDAO noticeBoardDAO;
    private final MinioStorageService minioStorageService;

    public AttachmentServiceImpl(NoticeBoardDAO noticeBoardDAO, MinioStorageService minioStorageService) {
        this.noticeBoardDAO = noticeBoardDAO;
        this.minioStorageService = minioStorageService;
    }

    @Override
    public List<AttachmentFileVO> listAttachments(Long tenantId, String ownerType, Long ownerId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", ownerId);

        List<NoticeBoardFileVO> files = noticeBoardDAO.selectNoticeAttachmentList(params);
        if (files == null) {
            return new ArrayList<>();
        }

        List<AttachmentFileVO> attachments = new ArrayList<>();
        for (NoticeBoardFileVO file : files) {
            AttachmentFileVO attachment = convert(file);
            if (attachment != null) {
                attachment.setOwnerType(ownerType.toUpperCase());
                attachment.setOwnerId(ownerId);
                attachments.add(attachment);
            }
        }
        return attachments;
    }

    @Override
    @Transactional
    public AttachmentFileVO uploadAttachment(Long tenantId, String ownerType, Long ownerId, MultipartFile file, String uploaderId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }

        String originalName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (!StringUtils.hasText(originalName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드 파일명이 없습니다.");
        }

        String normalizedName = originalName.replace("\\", "/");
        String objectKey = "tenant/" + tenantId + "/" + ownerType.toLowerCase() + "/" + ownerId + "/" + normalizedName;
        String bucketName = DEFAULT_BUCKET;

        try {
            minioStorageService.upload(bucketName, objectKey, file.getInputStream(), file.getSize(), file.getContentType());
            String sha256 = sha256(file.getBytes());
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("postId", ownerId);
            params.put("fileName", normalizedName);
            params.put("filePath", "minio://" + bucketName + "/" + objectKey);
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
            NoticeBoardFileVO persisted = noticeBoardDAO.selectNoticeAttachmentById(lookup);
            return convert(persisted);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MinIO 업로드 중 오류가 발생했습니다.");
        }
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long attachmentId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (attachmentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardFileId", attachmentId);
        NoticeBoardFileVO attachment = noticeBoardDAO.selectNoticeAttachmentById(params);
        if (attachment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }

        try {
            minioStorageService.delete(attachment.getBucketName(), attachment.getObjectKey());
        } catch (Exception ignored) {
            // MinIO 삭제 실패는 DB soft-delete로 보완한다.
        }

        noticeBoardDAO.softDeleteNoticeAttachment(params);
    }

    @Override
    public void downloadAttachment(Long tenantId, Long attachmentId, HttpServletResponse response) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (attachmentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardFileId", attachmentId);
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

        try (ServletOutputStream outputStream = response.getOutputStream();
             java.io.InputStream inputStream = minioStorageService.download(bucketName, objectKey)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            outputStream.flush();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 다운로드 중 오류가 발생했습니다.");
        }
    }

    private AttachmentFileVO convert(NoticeBoardFileVO source) {
        if (source == null) {
            return null;
        }

        AttachmentFileVO attachment = new AttachmentFileVO();
        attachment.setAttachmentId(source.getBoardFileId());
        attachment.setOwnerType("NOTICE");
        attachment.setOwnerId(source.getPostId());
        attachment.setFileName(source.getFileName());
        attachment.setFilePath(source.getFilePath());
        attachment.setObjectKey(source.getObjectKey());
        attachment.setBucketName(source.getBucketName());
        attachment.setStorageProvider(source.getStorageProvider());
        attachment.setFileSize(source.getFileSize());
        attachment.setMimeType(source.getMimeType());
        attachment.setContentType(source.getContentType());
        attachment.setUploadedBy(source.getUploadedBy());
        attachment.setCreatedAt(source.getCreatedAt());
        attachment.setUpdatedAt(source.getUpdatedAt());
        return attachment;
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
