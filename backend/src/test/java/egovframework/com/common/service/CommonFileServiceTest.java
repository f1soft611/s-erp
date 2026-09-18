package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.impl.CommonFileServiceImpl;

class CommonFileServiceTest {

    @Test
    void uploadFileUsesConfiguredStorageBucket() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                captured.put("bucketName", bucketName);
                captured.put("objectKey", objectKey);
            }
        };
        MockMultipartFile file = new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes("UTF-8"));
        CommonFileServiceImpl service = new CommonFileServiceImpl(storageService, null);
        ReflectionTestUtils.setField(service, "storageBucket", "tenant-documents");

        CommonFileVO uploaded = service.uploadFile(1L, "NOTICE", 2L, file, "admin");

        assertThat(captured).containsEntry("bucketName", "tenant-documents");
        assertThat(uploaded.getBucketName()).isEqualTo("tenant-documents");
        assertThat(uploaded.getFilePath()).startsWith("minio://tenant-documents/");
    }

    @Test
    void uploadFilePreservesMinioFailureCause() throws Exception {
        IOException rootCause = new IOException("connection refused");
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) throws Exception {
                throw rootCause;
            }
        };
        MockMultipartFile file = new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes("UTF-8"));

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, null)
                .uploadFile(1L, "NOTICE", 2L, file, "admin"),
            ResponseStatusException.class);

        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(thrown).hasCause(rootCause);
    }

    @Test
    void deleteFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public void softDeleteCommonFileByOwner(Map<String, Object> params) {
                captured.putAll(params);
            }
        };

        new CommonFileServiceImpl(null, dao)
            .deleteFile(1L, "NOTICE_COMMENT", 42L, 8L);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }

    @Test
    void downloadFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) {
                captured.putAll(params);
                return null;
            }
        };
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CommonFileServiceImpl(null, dao)
            .downloadFile(1L, "NOTICE_COMMENT", 42L, 8L, response);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }

    @Test
    void downloadFileStreamsTheStoredObjectWithItsMetadata() throws Exception {
        CommonFileVO file = new CommonFileVO();
        file.setFileId(8L);
        file.setFileName("notice.txt");
        file.setObjectKey("tenant/1/notice/42/notice.txt");
        file.setBucketName("tenant-documents");
        file.setMimeType("text/plain");
        file.setFileSize(5L);

        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) {
                return file;
            }
        };
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public InputStream download(String bucketName, String objectKey) {
                return new java.io.ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8));
            }
        };
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CommonFileServiceImpl(storageService, dao)
            .downloadFile(1L, "NOTICE", 42L, 8L, response);

        assertThat(response.getContentType()).isEqualTo("text/plain");
        assertThat(response.getHeader("Content-Disposition"))
            .isEqualTo("attachment; filename=\"notice.txt\"");
        assertThat(response.getContentAsByteArray()).isEqualTo("hello".getBytes(StandardCharsets.UTF_8));
    }
}