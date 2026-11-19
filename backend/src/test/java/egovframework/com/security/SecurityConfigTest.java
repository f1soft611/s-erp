package egovframework.com.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Properties;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ComponentScan;

import egovframework.com.config.EgovConfigAppCommon;
import egovframework.com.config.EgovConfigWebDispatcherServlet;

class SecurityConfigTest {

    @DisplayName("공개 경로는 로그인 전용 엔드포인트만 허용해야 한다")
    @Test
    void loginOnlyApiShouldBeWhitelisted() throws Exception {
        Field field = SecurityConfig.class.getDeclaredField("AUTH_WHITELIST");
        field.setAccessible(true);

        String[] whitelist = (String[]) field.get(new SecurityConfig());

        assertTrue(Arrays.asList(whitelist).contains("/auth/login"));
        assertTrue(Arrays.asList(whitelist).contains("/auth/login-jwt"));
        assertTrue(Arrays.asList(whitelist).contains("/auth/refresh"));
        assertTrue(Arrays.asList(whitelist).contains("/v3/api-docs/**"));
        assertTrue(Arrays.asList(whitelist).contains("/swagger-ui/**"));
    }

    @DisplayName("Swagger 공통 기본 스캔은 로그인/인증 공통 영역만 포함해야 한다")
    @Test
    void swaggerPublicDefaultsShouldBeLimitedToLoginAndSharedAuthModules() throws IOException {
        Properties properties = new Properties();
        try (InputStream input = SecurityConfig.class.getClassLoader()
                .getResourceAsStream("application.properties")) {
            assertNotNull(input, "Public application defaults must be on the classpath");
            properties.load(input);
        }
        String scanPackages = properties.getProperty("springdoc.packages-to-scan");
        assertNotNull(scanPackages, "Public Swagger scan packages must be configured");
        assertEquals(new HashSet<>(Arrays.asList(
                "egovframework.com", "egovframework.let.uat.uia.web")),
                new HashSet<>(Arrays.asList(scanPackages.trim().split("\\s*,\\s*"))));
    }

    @DisplayName("애플리케이션 스캔은 로그인/공통 인증 패키지로 제한되어야 한다")
    @Test
    void componentScanShouldBeRestrictedToLoginAndAuthPackages() {
        ComponentScan appScan = EgovConfigAppCommon.class.getAnnotation(ComponentScan.class);
        ComponentScan webScan = EgovConfigWebDispatcherServlet.class.getAnnotation(ComponentScan.class);

        assertTrue(Arrays.asList(appScan.basePackages()).contains("egovframework.com"));
        assertTrue(Arrays.asList(appScan.basePackages()).contains("egovframework.let.uat.uia"));
        assertTrue(Arrays.asList(appScan.basePackages()).contains("egovframework.let.uss.auth"));
        assertTrue(Arrays.asList(webScan.basePackages()).contains("egovframework.let.uat.uia"));
        assertTrue(Arrays.asList(webScan.basePackages()).contains("egovframework.let.uss.auth"));
        assertTrue(Arrays.asList(appScan.basePackages()).stream().noneMatch(pkg -> pkg.startsWith("egovframework.let.dashboard")));
        assertTrue(Arrays.asList(appScan.basePackages()).stream().noneMatch(pkg -> pkg.startsWith("egovframework.let.documents")));
        assertTrue(Arrays.asList(appScan.basePackages()).stream().noneMatch(pkg -> pkg.startsWith("egovframework.let.storage")));
    }
}