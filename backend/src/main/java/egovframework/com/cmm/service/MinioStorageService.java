package egovframework.com.cmm.service;

import java.io.InputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;

@Service
public class MinioStorageService {

    private final MinioClient minioClient;

    @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}")
    private String defaultBucket;

    @Value("${storage.autoCreateBucket:false}")
    private boolean autoCreateBucket;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public void ensureBucketExists(String bucketName) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(targetBucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(targetBucket).build());
        }
    }

    public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        if (autoCreateBucket) {
            ensureBucketExists(targetBucket);
        }
        minioClient.putObject(PutObjectArgs.builder()
                .bucket(targetBucket)
                .object(objectKey)
                .stream(inputStream, size, -1)
                .contentType(contentType)
                .build());
    }

    public InputStream download(String bucketName, String objectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        return minioClient.getObject(GetObjectArgs.builder().bucket(targetBucket).object(objectKey).build());
    }

    public void delete(String bucketName, String objectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        minioClient.removeObject(RemoveObjectArgs.builder().bucket(targetBucket).object(objectKey).build());
    }
}
