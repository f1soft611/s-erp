package egovframework.let.uat.uia.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.com.jwt.EgovJwtTokenUtil;
import egovframework.let.uat.uia.service.EgovLoginService;

/** 토큰 갱신은 토큰 안의 정보만 믿지 않고 계정이 아직 로그인할 수 있는 상태인지 확인한다. */
class EgovLoginRefreshAccountStatusTest {

    private EgovLoginService loginService;
    private EgovJwtTokenUtil jwtTokenUtil;
    private EgovLoginApiController controller;

    @BeforeEach
    void setUp() {
        loginService = mock(EgovLoginService.class);
        jwtTokenUtil = mock(EgovJwtTokenUtil.class);
        controller = new EgovLoginApiController();
        ReflectionTestUtils.setField(controller, "loginService", loginService);
        ReflectionTestUtils.setField(controller, "jwtTokenUtil", jwtTokenUtil);

        LoginVO tokenUser = new LoginVO();
        tokenUser.setId("hong.gd");
        tokenUser.setTenantId(1L);
        when(jwtTokenUtil.isValidRefreshToken("refresh")).thenReturn(true);
        when(jwtTokenUtil.getLoginVOFromToken("refresh")).thenReturn(tokenUser);
        when(jwtTokenUtil.generateToken(any(LoginVO.class))).thenReturn("new-access");
    }

    private Map<String, Object> refresh() {
        Map<String, String> request = new HashMap<String, String>();
        request.put("refreshToken", "refresh");
        return controller.refreshToken(new HashMap<String, String>(request));
    }

    @DisplayName("로그인할 수 있는 계정이면 새 액세스 토큰을 발급한다")
    @Test
    void issuesATokenForALoginableAccount() throws Exception {
        when(loginService.isLoginable(1L, "hong.gd")).thenReturn(true);

        Map<String, Object> result = refresh();

        assertEquals("200", result.get("resultCode"));
        assertEquals("new-access", result.get("jToken"));
    }

    @DisplayName("갱신할 때 DB의 비밀번호 변경 필요 여부를 새 토큰에 반영한다")
    @Test
    void carriesTheCurrentPasswordChangeRequirementIntoTheNewToken() throws Exception {
        when(loginService.isLoginable(1L, "hong.gd")).thenReturn(true);
        when(loginService.isPasswordChangeRequired(1L, "hong.gd")).thenReturn(true);

        refresh();

        org.mockito.ArgumentCaptor<LoginVO> issued = org.mockito.ArgumentCaptor.forClass(LoginVO.class);
        verify(jwtTokenUtil).generateToken(issued.capture());
        assertTrue(issued.getValue().isPasswordChangeRequired());
    }

    @DisplayName("미허용·퇴직 등으로 로그인할 수 없는 계정은 갱신을 거부한다")
    @Test
    void rejectsADisabledOrRetiredAccount() throws Exception {
        when(loginService.isLoginable(1L, "hong.gd")).thenReturn(false);

        Map<String, Object> result = refresh();

        assertEquals("401", result.get("resultCode"));
        assertNull(result.get("jToken"));
        verify(jwtTokenUtil, never()).generateToken(any(LoginVO.class));
    }
}
