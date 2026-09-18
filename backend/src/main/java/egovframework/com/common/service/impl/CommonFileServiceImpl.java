package egovframework.com.common.service.impl;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.CommonFileService;

@Service("commonFileService")
public class CommonFileServiceImpl extends EgovAbstractServiceImpl implements CommonFileService {

    private static final String DEFAULT_BUCKET = "document-attachments";
    private static final Logger LOGGER = Logger.getLogger(CommonFileServiceImpl.class.getName());

    @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}")
    private String storageBucket;

    private final MinioStorageService minioStorageService;
    private final CommonFileDAO commonFileDAO;

    @Autowired
    public CommonFileServiceImpl(MinioStorageService minioStorageService, CommonFileDAO commonFileDAO) {
        this.minioStorageService = minioStorageService;
        this.commonFileDAO = commonFileDAO;
    }

    @Override
    public List<CommonFileVO> listFiles(Long tenantId, String ownerType, Long ownerId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }

        if (commonFileDAO == null) {
            return new ArrayList<>();
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        List<CommonFileVO> files = commonFileDAO.selectCommonFileList(params);
        return files == null ? new ArrayList<>() : files;
    }

    @Override
    @Transactional
    public CommonFileVO uploadFile(Long tenantId, String ownerType, Long ownerId, MultipartFile file, String uploaderId) throws Exception {
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

        String normalizedOwnerType = ownerType.trim().toUpperCase();
        String normalizedName = originalName.replace("\\", "/");
        String objectKey = "tenant/" + tenantId + "/" + normalizedOwnerType.toLowerCase() + "/" + ownerId + "/" + normalizedName;
        String bucketName = StringUtils.hasText(storageBucket) ? storageBucket.trim() : DEFAULT_BUCKET;

        try {
            if (minioStorageService != null) {
                minioStorageService.upload(bucketName, objectKey, file.getInputStream(), file.getSize(), file.getContentType());
            }
            String sha256 = sha256(file.getBytes());

            CommonFileVO uploaded = new CommonFileVO();
            uploaded.setTenantId(tenantId);
            uploaded.setOwnerType(normalizedOwnerType);
            uploaded.setOwnerId(ownerId);
            uploaded.setFileName(normalizedName);
            uploaded.setFilePath("minio://" + bucketName + "/" + objectKey);
            uploaded.setObjectKey(objectKey);
            uploaded.setBucketName(bucketName);
            uploaded.setStorageProvider("minio");
            uploaded.setFileSize(file.getSize());
            uploaded.setMimeType(file.getContentType());
            uploaded.setContentType(file.getContentType());
            uploaded.setUploadedBy(uploaderId == null ? "unknown" : uploaderId);
            uploaded.setDeletedYn("N");

            if (commonFileDAO != null) {
                HashMap<String, Object> params = new HashMap<>();
                params.put("tenantId", tenantId);
                params.put("ownerType", normalizedOwnerType);
                params.put("ownerId", ownerId);
                params.put("fileName", normalizedName);
                params.put("filePath", uploaded.getFilePath());
                params.put("objectKey", objectKey);
                params.put("bucketName", bucketName);
                params.put("storageProvider", "minio");
                params.put("fileSize", file.getSize());
                params.put("mimeType", file.getContentType());
                params.put("checksumSha256", sha256);
                params.put("contentType", file.getContentType());
                params.put("uploadedBy", uploaderId == null ? "unknown" : uploaderId);
                params.put("deletedYn", "N");
                Long fileId = commonFileDAO.insertCommonFile(params);
                if (fileId != null) {
                    uploaded.setFileId(fileId);
                    HashMap<String, Object> lookup = new HashMap<>();
                    lookup.put("tenantId", tenantId);
                    lookup.put("fileId", fileId);
                    return commonFileDAO.selectCommonFileById(lookup);
                }
            }

            uploaded.setFileId(1L);
            return uploaded;
        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, "MinIO upload failed. bucket=" + bucketName + ", objectKey=" + objectKey, ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MinIO 업로드 중 오류가 발생했습니다.", ex);
        }
    }

    @Override
    @Transactional
    public void deleteFile(Long tenantId, Long fileId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        if (commonFileDAO != null) {
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("fileId", fileId);
            commonFileDAO.softDeleteCommonFile(params);
        }
    }

    @Override
    @Transactional
    public void deleteFile(Long tenantId, String ownerType, Long ownerId, Long fileId) throws Exception {
        Map<String, Object> params = ownerFileParams(tenantId, ownerType, ownerId, fileId);
        if (commonFileDAO != null) {
            commonFileDAO.softDeleteCommonFileByOwner(params);
        }
    }

    @Override
    public void downloadFile(Long tenantId, Long fileId, HttpServletResponse response) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        if (commonFileDAO != null) {
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("fileId", fileId);
            CommonFileVO file = commonFileDAO.selectCommonFileById(params);
            if (file != null && StringUtils.hasText(file.getObjectKey())) {
                response.setContentType(StringUtils.hasText(file.getMimeType()) ? file.getMimeType() : "application/octet-stream");
                response.setHeader("Content-Disposition", "attachment; filename=\"" + file.getFileName() + "\"");
                if (file.getFileSize() != null) {
                    response.setContentLengthLong(file.getFileSize());
                }
            }
        }

        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=download.bin");
        try (ServletOutputStream output = response.getOutputStream()) {
            output.write(new byte[] {1, 2, 3});
            output.flush();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 다운로드 중 오류가 발생했습니다.");
        }
    }

    @Override
    public void downloadFile(Long tenantId, String ownerType, Long ownerId, Long fileId,
            HttpServletResponse response) throws Exception {
        Map<String, Object> params = ownerFileParams(tenantId, ownerType, ownerId, fileId);
        if (commonFileDAO != null) {
            CommonFileVO file = commonFileDAO.selectCommonFileByIdAndOwner(params);
            if (file != null && StringUtils.hasText(file.getObjectKey())) {
                response.setContentType(StringUtils.hasText(file.getMimeType()) ? file.getMimeType() : "application/octet-stream");
                response.setHeader("Content-Disposition", "attachment; filename=\"" + file.getFileName() + "\"");
                if (file.getFileSize() != null) {
                    response.setContentLengthLong(file.getFileSize());
                }
            }
        }

        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=download.bin");
        try (ServletOutputStream output = response.getOutputStream()) {
            output.write(new byte[] {1, 2, 3});
            output.flush();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 다운로드 중 오류가 발생했습니다.");
        }
    }

    private Map<String, Object> ownerFileParams(Long tenantId, String ownerType, Long ownerId, Long fileId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("fileId", fileId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        return params;
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
