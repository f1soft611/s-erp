package egovframework.let.groupware.community.notice.service.impl;

import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.service.NoticeEmbeddedImageService;

@Service
public class NoticeEmbeddedImageServiceImpl implements NoticeEmbeddedImageService {

    private static final long DEFAULT_MAX_FILE_SIZE = 10L * 1024L * 1024L;

    private final MinioStorageService storageService;
    private final String bucketName;
    private final String publicEndpoint;
    private final long maxFileSize;

        public NoticeEmbeddedImageServiceImpl(MinioStorageService storageService,
            @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}") String bucketName,
            @Value("${storage.publicEndpoint:${STORAGE_PUBLIC_ENDPOINT:}}") String publicEndpoint,
            @Value("${storage.embeddedImageMaxFileSize:${STORAGE_EMBEDDED_IMAGE_MAX_FILE_SIZE:10485760}}") long maxFileSize) {
        this.storageService = storageService;
        this.bucketName = StringUtils.hasText(bucketName) ? bucketName.trim() : "document-attachments";
        this.publicEndpoint = trimTrailingSlash(publicEndpoint);
        this.maxFileSize = maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_FILE_SIZE;
    }

    @Override
    public NoticeEmbeddedImageVO uploadTemporaryImage(Long tenantId, String uploaderId,
            MultipartFile file) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
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
        if (!StringUtils.hasText(publicEndpoint)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 공개 URL 설정이 없습니다.");
        }

        String uploadToken = UUID.randomUUID().toString();
        String fileName = safeFileName(file.getOriginalFilename());
        String objectKey = "tenant/" + tenantId + "/notice-temp/" + uploadToken + "/" + fileName;
        storageService.upload(bucketName, objectKey, file.getInputStream(), file.getSize(), mimeType);

        NoticeEmbeddedImageVO result = new NoticeEmbeddedImageVO();
        result.setUploadToken(uploadToken);
        result.setFileId(uploadToken);
        result.setFileName(fileName);
        result.setFileSize(file.getSize());
        result.setMimeType(mimeType);
        result.setObjectKey(objectKey);
        result.setBucketName(bucketName);
        result.setImageUrl(publicEndpoint + "/" + bucketName + "/" + objectKey);
        return result;
    }

    private boolean isSupportedImage(String mimeType, byte[] bytes) {
        if ("image/png".equals(mimeType)) {
            return startsWith(bytes, new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        }
        if ("image/jpeg".equals(mimeType)) {
            return startsWith(bytes, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});
        }
        if ("image/gif".equals(mimeType)) {
            return startsWith(bytes, new byte[] {'G', 'I', 'F', '8'});
        }
        if ("image/webp".equals(mimeType)) {
            return startsWith(bytes, new byte[] {'R', 'I', 'F', 'F'})
                && bytes.length >= 12
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
        }
        return false;
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

    private String normalizeMimeType(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String safeFileName(String originalName) {
        String fileName = StringUtils.cleanPath(originalName == null ? "pasted-image" : originalName);
        fileName = fileName.replace("\\", "/");
        int slashIndex = fileName.lastIndexOf('/');
        if (slashIndex >= 0) {
            fileName = fileName.substring(slashIndex + 1);
        }
        return StringUtils.hasText(fileName) ? fileName : "pasted-image";
    }

    private String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String result = value.trim();
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
