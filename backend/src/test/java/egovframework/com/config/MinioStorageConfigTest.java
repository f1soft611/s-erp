package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.DependencyDescriptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.MethodParameter;
import org.springframework.mock.env.MockEnvironment;

import io.minio.MinioClient;

class MinioStorageConfigTest {

    @Test
    void minioClientResolvesExternalConfigurationWithoutPrivateProfiles() throws Exception {
        Method factory = MinioStorageConfig.class.getMethod("minioClient",
                String.class, String.class, String.class, String.class);
        String[] propertyKeys = {
            "storage.endpoint", "storage.accessKey", "storage.secretKey", "storage.region"
        };
        String[] environmentKeys = {
            "STORAGE_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "STORAGE_REGION"
        };
        // These sentinels do not identify a real storage service or account.
        String[] primaryValues = {
            "http://127.0.0.1:19000", "fixture-primary-access", "fixture-primary-secret", "us-east-1"
        };
        String[] fallbackValues = {
            "http://127.0.0.1:19001", "fixture-fallback-access", "fixture-fallback-secret", "eu-west-1"
        };

        for (int i = 0; i < propertyKeys.length; i++) {
            Value annotation = factory.getParameters()[i].getAnnotation(Value.class);
            assertNotNull(annotation, "Factory parameter must declare external configuration");
            assertTrue(annotation.value().startsWith(
                    "${" + propertyKeys[i] + ":${" + environmentKeys[i] + ":"),
                    "Factory configuration key mismatch for " + propertyKeys[i]);
        }

        for (boolean includePrimary : new boolean[] { true, false }) {
            MockEnvironment environment = new MockEnvironment();
            for (int i = 0; i < propertyKeys.length; i++) {
                environment.withProperty(environmentKeys[i], fallbackValues[i]);
                if (includePrimary) {
                    environment.withProperty(propertyKeys[i], primaryValues[i]);
                }
            }
            String[] expectedValues = includePrimary ? primaryValues : fallbackValues;
            try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
                context.setEnvironment(environment);
                context.register(MinioStorageConfig.class);
                context.refresh();

                for (int i = 0; i < propertyKeys.length; i++) {
                    Object resolved = context.getBeanFactory().resolveDependency(
                            new DependencyDescriptor(new MethodParameter(factory, i), true),
                            "minioClient");
                    assertTrue(expectedValues[i].equals(resolved),
                            "Fixture property binding mismatch for " + propertyKeys[i]);
                }
                assertNotNull(context.getBean(MinioClient.class));
            }
        }
    }

    @Test
    void minioClientDependencyUsesSingleSupportedVersion() throws IOException {
        String pom = new String(Files.readAllBytes(Paths.get("pom.xml")), StandardCharsets.UTF_8);

        assertEquals(1, countOccurrences(pom, "<artifactId>minio</artifactId>"),
                "MinIO client dependency should be declared once");
        assertTrue(pom.contains("<version>8.5.11</version>"),
                "MinIO client should use the supported version");
        assertFalse(pom.contains("<version>8.5.7</version>"),
                "Older MinIO client version should not override the supported version");
    }

    private int countOccurrences(String text, String token) {
        int count = 0;
        int offset = 0;
        while ((offset = text.indexOf(token, offset)) >= 0) {
            count++;
            offset += token.length();
        }
        return count;
    }
}
