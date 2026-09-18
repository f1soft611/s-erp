package egovframework.com.cmm.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;

class MinioStorageServiceTest {

    @Test
    void uploadDoesNotRequireBucketManagementByDefault() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        when(minioClient.bucketExists(any(BucketExistsArgs.class)))
            .thenThrow(new RuntimeException("bucket check denied"));
        MinioStorageService service = new MinioStorageService(minioClient);

        service.upload("document-attachments", "tenant/1/notice/2/notice.txt",
            new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)), 5L, "text/plain");

        verify(minioClient, never()).bucketExists(any(BucketExistsArgs.class));
        verify(minioClient).putObject(any(PutObjectArgs.class));
    }
}