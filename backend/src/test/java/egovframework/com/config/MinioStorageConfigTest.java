package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class MinioStorageConfigTest {

    @Test
    void minioDefaultsMatchProjectCredentials() throws IOException {
        String devProps = new String(Files.readAllBytes(Paths.get("src/main/resources/application-dev.properties")), StandardCharsets.UTF_8);
        String prodProps = new String(Files.readAllBytes(Paths.get("src/main/resources/application-prod.properties")), StandardCharsets.UTF_8);

        assertTrue(devProps.contains("storage.endpoint=${STORAGE_ENDPOINT:http://127.0.0.1:9000}"),
                "dev profile should default to the local MinIO endpoint");
        assertTrue(devProps.contains("storage.accessKey=${MINIO_ACCESS_KEY:dev-access-key}"),
                "dev profile should default to the project MinIO access key");
        assertTrue(devProps.contains("storage.secretKey=${MINIO_SECRET_KEY:dev-secret-key}"),
                "dev profile should default to the project MinIO secret key");
        assertTrue(prodProps.contains("storage.accessKey=${MINIO_ACCESS_KEY:dev-access-key}"),
                "prod profile should default to the project MinIO access key");
        assertTrue(prodProps.contains("storage.secretKey=${MINIO_SECRET_KEY:dev-secret-key}"),
                "prod profile should default to the project MinIO secret key");
    }
}
