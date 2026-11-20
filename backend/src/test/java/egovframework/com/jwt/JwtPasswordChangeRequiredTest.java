package egovframework.com.jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.servlet.FilterChain;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;

/** 비밀번호 변경이 필요한 계정은 변경 외의 API를 쓸 수 없다(토큰 클레임 + 인증 필터). */
class JwtPasswordChangeRequiredTest {

    private JwtAuthenticationFilter filter;
    private EgovJwtTokenUtil jwtTokenUtil;
    private MockHttpServletResponse response;
    private FilterChain chain;

    @BeforeEach
    void setUp() throws Exception {
        jwtTokenUtil = mock(EgovJwtTokenUtil.class);
        filter = new JwtAuthenticationFilter();
        ReflectionTestUtils.setField(filter, "jwtTokenUtil", jwtTokenUtil);
        response = new MockHttpServletResponse();
        chain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest request(String method, String uri, boolean passwordChangeRequired) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setContextPath("/s-erp-backend");
        request.setRequestURI("/s-erp-backend" + uri);
        request.addHeader("Authorization", "Bearer token");
        LoginVO loginVO = new LoginVO();
        loginVO.setId("hong.gd");
        loginVO.setRoleCode("TENANT_USER");
        loginVO.setPasswordChangeRequired(passwordChangeRequired);
        when(jwtTokenUtil.getLoginVOFromToken("token")).thenReturn(loginVO);
        return request;
    }

    @DisplayName("변경이 필요한 계정은 일반 API 요청을 403 PASSWORD_CHANGE_REQUIRED로 거부한다")
    @Test
    void blocksEveryOtherApiWhileAChangeIsRequired() throws Exception {
        filter.doFilterInternal(request("GET", "/api/v1/hr/employees", true), response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentType().startsWith("application/json"));
        assertTrue(response.getContentAsString().contains("\"resultCode\":\"PASSWORD_CHANGE_REQUIRED\""));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain, never()).doFilter(any(), any());
    }

    @DisplayName("비밀번호 변경 API는 허용한다")
    @Test
    void allowsThePasswordChangeEndpoint() throws Exception {
        filter.doFilterInternal(request("PUT", "/api/v1/users/me/password", true), response, chain);

        assertEquals(200, response.getStatus());
        verify(chain).doFilter(any(), any());
    }

    @DisplayName("같은 주소라도 변경 API가 아닌 메서드는 허용하지 않는다")
    @Test
    void doesNotAllowOtherMethodsOnThePasswordPath() throws Exception {
        filter.doFilterInternal(request("GET", "/api/v1/users/me/password", true), response, chain);

        assertEquals(403, response.getStatus());
        verify(chain, never()).doFilter(any(), any());
    }

    @DisplayName("로그아웃과 토큰 갱신 등 /auth 경로는 허용한다")
    @Test
    void allowsAuthEndpoints() throws Exception {
        for (String uri : new String[] {"/auth/logout", "/auth/refresh"}) {
            response = new MockHttpServletResponse();
            filter.doFilterInternal(request("POST", uri, true), response, chain);
            assertEquals(200, response.getStatus(), uri);
        }
        verify(chain, org.mockito.Mockito.times(2)).doFilter(any(), any());
    }

    @DisplayName("변경이 필요하지 않은 계정은 그대로 인증된다")
    @Test
    void doesNotAffectNormalAccounts() throws Exception {
        filter.doFilterInternal(request("GET", "/api/v1/hr/employees", false), response, chain);

        assertEquals(200, response.getStatus());
        assertFalse(SecurityContextHolder.getContext().getAuthentication() == null);
        verify(chain).doFilter(any(), any());
    }

    @DisplayName("변경 필요 표시는 토큰에 담겼다가 그대로 읽힌다")
    @Test
    void theFlagSurvivesATokenRoundTrip() {
        EgovJwtTokenUtil util = new EgovJwtTokenUtil();
        LoginVO required = new LoginVO();
        required.setId("hong.gd");
        required.setPasswordChangeRequired(true);
        LoginVO normal = new LoginVO();
        normal.setId("kim.gd");

        assertTrue(util.getLoginVOFromToken(util.generateToken(required)).isPasswordChangeRequired());
        assertTrue(util.getLoginVOFromToken(util.generateRefreshToken(required)).isPasswordChangeRequired());
        assertFalse(util.getLoginVOFromToken(util.generateToken(normal)).isPasswordChangeRequired());
    }
}
