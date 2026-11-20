package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.policies.domain.model.LoginLockPolicyVO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.uat.uia.domain.model.LoginLockStateVO;

/** 로그인 실패 잠금 정책: 미사용이면 이전과 같고, 사용이면 실패를 누적·잠그며 성공하면 횟수를 지운다. */
class EgovLoginLockPolicyTest {

    private static final Long TENANT = 1L;

    private LoginDAO loginDAO;
    private SystemPolicyService policyService;
    private EgovLoginServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        loginDAO = mock(LoginDAO.class);
        policyService = mock(SystemPolicyService.class);
        service = new EgovLoginServiceImpl();
        ReflectionTestUtils.setField(service, "loginDAO", loginDAO);
        ReflectionTestUtils.setField(service, "systemPolicyService", policyService);
        when(loginDAO.selectTenantIdByCode("T1")).thenReturn(TENANT);
    }

    private static LoginVO request() {
        LoginVO vo = new LoginVO();
        vo.setTenantCode("T1");
        vo.setId("hong.gd");
        vo.setPassword("plain");
        return vo;
    }

    private static LoginVO account() {
        LoginVO vo = new LoginVO();
        vo.setId("hong.gd");
        vo.setPassword("hash");
        return vo;
    }

    private static LoginLockStateVO state(int attempts, boolean locked) {
        LoginLockStateVO vo = new LoginLockStateVO();
        vo.setLoginId(55L);
        vo.setAttemptCount(attempts);
        vo.setLocked(locked);
        return vo;
    }

    private void policy(boolean enabled, int max) throws Exception {
        when(policyService.getLoginLockPolicy(TENANT)).thenReturn(new LoginLockPolicyVO(enabled, max));
    }

    @DisplayName("정책이 미사용이면 잠금 조회·누적을 전혀 하지 않는다")
    @Test
    void disabledPolicyLeavesLoginUntouched() throws Exception {
        policy(false, 5);
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(null);

        LoginVO result = service.actionLogin(request());

        assertNull(result.getId());
        assertFalse(result.isAccountLocked());
        verify(loginDAO, never()).selectLockState(anyLong(), anyString());
        verify(loginDAO, never()).increaseFailedAttempt(anyLong(), anyLong(), anyInt());
        verify(loginDAO, never()).resetFailedAttempts(anyLong());
    }

    @DisplayName("정책 행을 읽지 못해도 미사용으로 보고 로그인한다")
    @Test
    void missingPolicyServiceOrErrorMeansDisabled() throws Exception {
        ReflectionTestUtils.setField(service, "systemPolicyService", null);
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(account());

        assertEquals("hong.gd", service.actionLogin(request()).getId());
        verify(loginDAO, never()).selectLockState(anyLong(), anyString());
    }

    @DisplayName("사용 중이고 비밀번호가 틀리면 실패 횟수를 올린다")
    @Test
    void enabledPolicyCountsAFailedPassword() throws Exception {
        policy(true, 5);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(state(2, false));
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(null);

        LoginVO result = service.actionLogin(request());

        assertNull(result.getId());
        assertFalse(result.isAccountLocked());
        verify(loginDAO).increaseFailedAttempt(TENANT, 55L, 5);
    }

    @DisplayName("이미 잠긴 계정은 비밀번호가 맞아도 거부하고 횟수를 올리지 않는다")
    @Test
    void lockedAccountIsRejectedEvenWithTheRightPassword() throws Exception {
        policy(true, 5);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(state(5, true));
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(account());

        LoginVO result = service.actionLogin(request());

        assertNull(result.getId());
        assertTrue(result.isAccountLocked());
        verify(loginDAO, never()).actionLogin(any(LoginVO.class));
        verify(loginDAO, never()).increaseFailedAttempt(anyLong(), anyLong(), anyInt());
    }

    @DisplayName("존재하지 않는 계정의 실패는 누적하지 않는다")
    @Test
    void unknownAccountIsNotCounted() throws Exception {
        policy(true, 5);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(null);
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(null);

        LoginVO result = service.actionLogin(request());

        assertNull(result.getId());
        assertFalse(result.isAccountLocked());
        verify(loginDAO, never()).increaseFailedAttempt(anyLong(), anyLong(), anyInt());
    }

    @DisplayName("로그인에 성공하면 쌓인 실패 횟수를 지운다")
    @Test
    void successClearsPreviousFailures() throws Exception {
        policy(true, 5);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(state(3, false));
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(account());

        LoginVO result = service.actionLogin(request());

        assertEquals("hong.gd", result.getId());
        verify(loginDAO).resetFailedAttempts(55L);
        verify(loginDAO, never()).increaseFailedAttempt(anyLong(), anyLong(), anyInt());
    }

    @DisplayName("실패 기록이 없으면 성공해도 초기화 쿼리를 보내지 않는다")
    @Test
    void successWithoutFailuresDoesNotWrite() throws Exception {
        policy(true, 5);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(state(0, false));
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(account());

        assertEquals("hong.gd", service.actionLogin(request()).getId());
        verify(loginDAO, never()).resetFailedAttempts(anyLong());
    }

    @DisplayName("기준 횟수는 정책 값을 그대로 사용한다")
    @Test
    void usesThePolicyLimit() throws Exception {
        policy(true, 8);
        when(loginDAO.selectLockState(TENANT, "hong.gd")).thenReturn(state(0, false));
        when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(null);

        service.actionLogin(request());

        verify(loginDAO).increaseFailedAttempt(TENANT, 55L, 8);
    }
}
