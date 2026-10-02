package egovframework.let.co.workflow.form.service.impl;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;
import io.minio.StatObjectResponse;

@Service("draftingWorkTemplateImageService")
public class DraftingWorkTemplateImageServiceImpl implements DraftingWorkTemplateImageService {

    private static final long DEFAULT_MAX_FILE_SIZE = 10L * 1024L * 1024L;
    private static final String TEMPLATE_OWNER_TYPE = "DRAFTING_WORK_TEMPLATE";
    private static final String TEMPORARY_LIFECYCLE_TAG_KEY = "s-erp-temp-owner";
    private static final String TEMPORARY_LIFECYCLE_TAG_VALUE = "drafting-work-form";
    private static final Logger LOGGER = Logger.getLogger(DraftingWorkTemplateImageServiceImpl.class.getName());

    private final DraftingWorkDAO draftingWorkDAO;
    private final CommonFileDAO commonFileDAO;
    private final MinioStorageService storageService;
    private final String bucketName;
    private final long maxFileSize;

    public DraftingWorkTemplateImageServiceImpl(
            DraftingWorkDAO draftingWorkDAO,
            CommonFileDAO commonFileDAO,
            MinioStorageService storageService,
            @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}") String bucketName,
            @Value("${storage.embeddedImageMaxFileSize:${STORAGE_EMBEDDED_IMAGE_MAX_FILE_SIZE:10485760}}") long maxFileSize) {
        this.draftingWorkDAO = draftingWorkDAO;
        this.commonFileDAO = commonFileDAO;
        this.storageService = storageService;
        this.bucketName = StringUtils.hasText(bucketName) ? bucketName.trim() : "document-attachments";
        this.maxFileSize = maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_FILE_SIZE;
    }

    @Override
    public DraftingWorkTemplateUploadVO uploadTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, MultipartFile file) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 이미지가 없습니다.");
        }
        if (file.getSize() > maxFileSize) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "이미지 파일 크기가 제한을 초과했습니다.");
        }

        String mimeType = normalizeMimeType(file.getContentType());
        byte[] bytes = file.getBytes();
        if (!isSupportedImage(mimeType, bytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 파일입니다.");
        }

        String uploadToken = UUID.randomUUID().toString();
        String fileName = safeFileName(file.getOriginalFilename());
        String objectKey = buildTemporaryObjectKey(tenantId, draftingWorkCategoryId, uploadToken, fileName);
        storageService.uploadTagged(bucketName, objectKey, new ByteArrayInputStream(bytes), bytes.length,
            mimeType, Collections.singletonMap(TEMPORARY_LIFECYCLE_TAG_KEY, TEMPORARY_LIFECYCLE_TAG_VALUE));

        DraftingWorkTemplateUploadVO result = new DraftingWorkTemplateUploadVO();
        result.setUploadToken(uploadToken);
        result.setFileName(fileName);
        result.setFileSize((long) bytes.length);
        result.setMimeType(mimeType);
        return result;
    }

    @Override
    public void deleteTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, String uploadToken, String fileName) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        if (!isCanonicalUuid(uploadToken) || !StringUtils.hasText(fileName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
        }
        String safeName = safeFileName(fileName);
        String objectKey = buildTemporaryObjectKey(tenantId, draftingWorkCategoryId, uploadToken, safeName);
        storageService.delete(bucketName, objectKey);
    }

    @Override
    public CommonFileVO promoteTemporaryImage(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        if (!isCanonicalUuid(uploadToken) || !StringUtils.hasText(fileName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
        }

        String safeName = safeFileName(fileName);
        String temporaryKey = buildTemporaryObjectKey(tenantId, draftingWorkCategoryId, uploadToken, safeName);
        String permanentKey = buildPermanentObjectKey(tenantId, draftingWorkCategoryId, uploadToken, safeName);
        StatObjectResponse metadata = storageService.stat(bucketName, temporaryKey);
        String mimeType = normalizeMimeType(metadata.contentType());
        long fileSize = metadata.size();
        if (fileSize <= 0 || fileSize > maxFileSize || !isSupportedMimeType(mimeType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 메타데이터가 올바르지 않습니다.");
        }

        storageService.copyWithoutTags(bucketName, temporaryKey, permanentKey);
        try {
            Map<String, Object> params = new java.util.HashMap<String, Object>();
            params.put("tenantId", tenantId);
            params.put("ownerType", TEMPLATE_OWNER_TYPE);
            params.put("ownerId", draftingWorkCategoryId);
            params.put("fileName", safeName);
            params.put("filePath", "minio://" + bucketName + "/" + permanentKey);
            params.put("objectKey", permanentKey);
            params.put("bucketName", bucketName);
            params.put("storageProvider", "minio");
            params.put("fileSize", fileSize);
            params.put("mimeType", mimeType);
            params.put("checksumSha256", null);
            params.put("contentType", mimeType);
            params.put("fileUsageType", "EMBEDDED");
            params.put("uploadedBy", StringUtils.hasText(uploadedBy) ? uploadedBy : "unknown");
            params.put("deletedYn", "N");
            Long fileId = commonFileDAO.insertCommonFile(params);
            if (fileId == null) {
                throw new IllegalStateException("기안양식 이미지 정보를 저장하지 못했습니다.");
            }
            registerRollbackCleanup(permanentKey);

            CommonFileVO result = new CommonFileVO();
            result.setFileId(fileId);
            result.setTenantId(tenantId);
            result.setOwnerType(TEMPLATE_OWNER_TYPE);
            result.setOwnerId(draftingWorkCategoryId);
            result.setFileName(safeName);
            result.setFilePath("minio://" + bucketName + "/" + permanentKey);
            result.setObjectKey(permanentKey);
            result.setBucketName(bucketName);
            result.setStorageProvider("minio");
            result.setFileSize(fileSize);
            result.setMimeType(mimeType);
            result.setContentType(mimeType);
            result.setFileUsageType("EMBEDDED");
            result.setUploadedBy(StringUtils.hasText(uploadedBy) ? uploadedBy : "unknown");
            result.setDeletedYn("N");
            return result;
        } catch (Exception ex) {
            storageService.delete(bucketName, permanentKey);
            throw ex;
        }
    }

    @Override
    public void streamTemplateImage(
            Long tenantId,
            Long draftingWorkCategoryId,
            Long fileId,
            HttpServletResponse response) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 ID가 없습니다.");
        }
        Map<String, Object> params = new java.util.HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("ownerType", TEMPLATE_OWNER_TYPE);
        params.put("ownerId", draftingWorkCategoryId);
        params.put("fileId", fileId);
        CommonFileVO file = commonFileDAO.selectCommonFileByIdAndOwner(params);
        if (!isOwnedTemplateImage(file, tenantId, draftingWorkCategoryId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "본문 이미지를 찾을 수 없습니다.");
        }
        if (storageService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 저장소를 사용할 수 없습니다.");
        }

        response.setContentType(file.getMimeType());
        response.setHeader("Content-Disposition", "inline");
        response.setHeader("Cache-Control", "private, max-age=300");
        response.setHeader("X-Content-Type-Options", "nosniff");
        if (file.getFileSize() != null) {
            response.setContentLengthLong(file.getFileSize());
        }
        try (InputStream input = storageService.download(file.getBucketName(), file.getObjectKey());
                ServletOutputStream output = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            output.flush();
        }
    }

    @Override
    public List<CommonFileVO> listTemplateImages(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        Map<String, Object> params = new java.util.HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("ownerType", TEMPLATE_OWNER_TYPE);
        params.put("ownerId", draftingWorkCategoryId);
        List<CommonFileVO> files = commonFileDAO.selectCommonFileList(params);
        if (files == null || files.isEmpty()) {
            return Collections.emptyList();
        }
        List<CommonFileVO> images = new ArrayList<CommonFileVO>();
        for (CommonFileVO file : files) {
            if (isOwnedTemplateImage(file, tenantId, draftingWorkCategoryId)) {
                images.add(file);
            }
        }
        return images;
    }

    @Override
    public void completeTemplateSave(
            Long tenantId,
            Long draftingWorkCategoryId,
            List<DraftingWorkTemplateEmbeddedImageVO> temporaryImages,
            Set<Long> retainedFileIds) throws Exception {
        requireTenant(tenantId);
        requireForm(tenantId, draftingWorkCategoryId);
        List<DraftingWorkTemplateEmbeddedImageVO> uploads = temporaryImages == null
                ? Collections.<DraftingWorkTemplateEmbeddedImageVO>emptyList()
                : temporaryImages;
        for (DraftingWorkTemplateEmbeddedImageVO image : uploads) {
            if (image == null || !isCanonicalUuid(image.getUploadToken()) || !StringUtils.hasText(image.getFileName())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
            }
        }

        Set<Long> retained = retainedFileIds == null ? Collections.<Long>emptySet() : retainedFileIds;
        List<CommonFileVO> removedImages = new ArrayList<CommonFileVO>();
        for (CommonFileVO file : listTemplateImages(tenantId, draftingWorkCategoryId)) {
            if (file.getFileId() != null && !retained.contains(file.getFileId())) {
                Map<String, Object> params = new java.util.HashMap<String, Object>();
                params.put("tenantId", tenantId);
                params.put("ownerType", TEMPLATE_OWNER_TYPE);
                params.put("ownerId", draftingWorkCategoryId);
                params.put("fileId", file.getFileId());
                commonFileDAO.softDeleteCommonFileByOwner(params);
                removedImages.add(file);
            }
        }

        registerAfterCommit(new Runnable() {
            @Override
            public void run() {
                for (CommonFileVO file : removedImages) {
                    deleteObjectQuietly(file.getBucketName(), file.getObjectKey());
                }
                for (DraftingWorkTemplateEmbeddedImageVO image : uploads) {
                    deleteObjectQuietly(bucketName, buildTemporaryObjectKey(tenantId, draftingWorkCategoryId,
                            image.getUploadToken(), safeFileName(image.getFileName())));
                }
            }
        });
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void requireForm(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        if (draftingWorkCategoryId == null
                || draftingWorkDAO.selectWorkById(tenantId, draftingWorkCategoryId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "기안양식을 찾을 수 없습니다.");
        }
    }

    private String buildTemporaryObjectKey(
            Long tenantId, Long draftingWorkCategoryId, String uploadToken, String fileName) {
        return "tenant/" + tenantId + "/drafting-work-form-temp/" + draftingWorkCategoryId
                + "/" + uploadToken + "/" + fileName;
    }

    private String buildPermanentObjectKey(
            Long tenantId, Long draftingWorkCategoryId, String uploadToken, String fileName) {
        return "tenant/" + tenantId + "/drafting-work-form/" + draftingWorkCategoryId
                + "/" + uploadToken + "/" + fileName;
    }

    private boolean isCanonicalUuid(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        try {
            return UUID.fromString(value).toString().equalsIgnoreCase(value);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private String safeFileName(String originalName) {
        String fileName = StringUtils.cleanPath(originalName == null ? "pasted-image" : originalName)
                .replace('\\', '/');
        int slashIndex = fileName.lastIndexOf('/');
        if (slashIndex >= 0) {
            fileName = fileName.substring(slashIndex + 1);
        }
        if (!StringUtils.hasText(fileName) || ".".equals(fileName) || "..".equals(fileName)) {
            return "pasted-image";
        }
        return fileName;
    }

    private String normalizeMimeType(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isSupportedImage(String mimeType, byte[] bytes) {
        if ("image/png".equals(mimeType)) {
            return startsWith(bytes, new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        }
        if ("image/jpeg".equals(mimeType)) {
            if (!startsWith(bytes, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff})
                    || bytes.length < 4) {
                return false;
            }
            int marker = bytes[3] & 0xff;
            return marker >= 0xc0 && marker <= 0xfe
                    && marker != 0xc8 && marker != 0xd8 && marker != 0xd9;
        }
        if ("image/gif".equals(mimeType)) {
            return startsWith(bytes, new byte[] {'G', 'I', 'F', '8'});
        }
        return "image/webp".equals(mimeType)
                && bytes != null && bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }

    private boolean isSupportedMimeType(String mimeType) {
        return "image/png".equals(mimeType) || "image/jpeg".equals(mimeType)
                || "image/gif".equals(mimeType) || "image/webp".equals(mimeType);
    }

    private boolean isOwnedTemplateImage(CommonFileVO file, Long tenantId, Long draftingWorkCategoryId) {
        if (file == null || !"EMBEDDED".equalsIgnoreCase(file.getFileUsageType())
                || !TEMPLATE_OWNER_TYPE.equalsIgnoreCase(file.getOwnerType())
                || !tenantId.equals(file.getTenantId()) || !draftingWorkCategoryId.equals(file.getOwnerId())
                || !"N".equalsIgnoreCase(file.getDeletedYn()) || !StringUtils.hasText(file.getObjectKey())
                || !isSupportedMimeType(normalizeMimeType(file.getMimeType()))) {
            return false;
        }
        String prefix = "tenant/" + tenantId + "/drafting-work-form/" + draftingWorkCategoryId + "/";
        String remainder = file.getObjectKey().startsWith(prefix)
                ? file.getObjectKey().substring(prefix.length())
                : "";
        int tokenSeparator = remainder.indexOf('/');
        if (tokenSeparator < 0 || !isCanonicalUuid(remainder.substring(0, tokenSeparator))) {
            return false;
        }
        return StringUtils.hasText(remainder.substring(tokenSeparator + 1))
                && remainder.substring(tokenSeparator + 1).indexOf('/') < 0;
    }

    private void registerRollbackCleanup(String objectKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    deleteObjectQuietly(bucketName, objectKey);
                }
            }
        });
    }

    private void registerAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private void deleteObjectQuietly(String targetBucket, String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            return;
        }
        try {
            storageService.delete(targetBucket, objectKey);
        } catch (Exception ex) {
            LOGGER.log(Level.WARNING, "기안양식 이미지 객체 정리에 실패했습니다.", ex);
        }
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        if (value == null || value.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (value[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }
}