package egovframework.let.system.policies.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import egovframework.let.system.policies.domain.model.LoginLockPolicyVO;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;
import egovframework.let.system.policies.service.impl.SystemPolicyServiceImpl;

/** 계정 보안 정책(로그인 실패 잠금, 사진 변경): 값 읽기와 정책 행 자동 보정. */
class SystemPolicyAccountSecurityTest {

    private static final Long TENANT = 1L;

    private SystemPolicyDAO dao;
    private SystemPolicyServiceImpl service;

    @BeforeEach
    void setUp() {
        dao = mock(SystemPolicyDAO.class);
        service = new SystemPolicyServiceImpl(dao);
    }

    private void policyValues(String enabledJson, String attemptsJson) throws Exception {
        when(dao.selectPolicyValueByCode(codeIs("LOGIN_LOCK_ENABLED"))).thenReturn(enabledJson);
        when(dao.selectPolicyValueByCode(codeIs("LOGIN_LOCK_MAX_ATTEMPTS"))).thenReturn(attemptsJson);
    }

    private static Map<String, Object> codeIs(final String code) {
        return org.mockito.ArgumentMatchers.argThat(new org.mockito.ArgumentMatcher<Map<String, Object>>() {
            @Override
            public boolean matches(Map<String, Object> params) {
                return params != null && code.equals(params.get("policyCode"));
            }
        });
    }

    // ---- 잠금 정책 읽기 ----

    @Test
    void lockPolicyIsDisabledWhenTheRowsAreMissing() throws Exception {
        LoginLockPolicyVO policy = service.getLoginLockPolicy(TENANT);

        assertThat(policy.isEnabled()).isFalse();
        assertThat(policy.getMaxAttempts()).isEqualTo(5);
    }

    @Test
    void lockPolicyReadsTheEnabledFlagAndTheLimit() throws Exception {
        policyValues("true", "7");

        LoginLockPolicyVO policy = service.getLoginLockPolicy(TENANT);

        assertThat(policy.isEnabled()).isTrue();
        assertThat(policy.getMaxAttempts()).isEqualTo(7);
    }

    @Test
    void lockPolicyFallsBackToTheDefaultLimitWhenTheValueIsOutOfRangeOrBroken() throws Exception {
        for (String bad : new String[] {"2", "11", "\"x\"", "not-json", "5.5"}) {
            policyValues("true", bad);
            assertThat(service.getLoginLockPolicy(TENANT).getMaxAttempts()).as(bad).isEqualTo(5);
        }
    }

    @Test
    void lockPolicyOnlyCountsABooleanTrueAsEnabled() throws Exception {
        for (String notTrue : new String[] {"false", "\"true\"", "1", "not-json"}) {
            policyValues(notTrue, "5");
            assertThat(service.getLoginLockPolicy(TENANT).isEnabled()).as(notTrue).isFalse();
        }
    }

    // ---- 사진 변경 정책 읽기 ----

    @Test
    void photoModeDefaultsToSelfAndOnlyAcceptsAdminOnlyExplicitly() throws Exception {
        assertThat(service.getProfilePhotoEditMode(TENANT)).isEqualTo("SELF");

        when(dao.selectPolicyValueByCode(codeIs("PROFILE_PHOTO_EDIT_MODE"))).thenReturn("\"ADMIN_ONLY\"");
        assertThat(service.getProfilePhotoEditMode(TENANT)).isEqualTo("ADMIN_ONLY");

        for (String other : new String[] {"\"SELF\"", "\"admin_only\"", "true", "not-json"}) {
            when(dao.selectPolicyValueByCode(codeIs("PROFILE_PHOTO_EDIT_MODE"))).thenReturn(other);
            assertThat(service.getProfilePhotoEditMode(TENANT)).as(other).isEqualTo("SELF");
        }
    }

    // ---- 정책 행 자동 보정 ----

    @Test
    @SuppressWarnings("unchecked")
    void listCreatesTheMissingAccountSecurityPoliciesWithDefaultsBeforeReading() throws Exception {
        when(dao.selectPolicyIdByCode(anyMap())).thenReturn(null);
        when(dao.insertPolicy(anyMap())).thenReturn(101L, 102L, 103L);
        when(dao.selectPolicyList(TENANT)).thenReturn(Collections.emptyList());

        service.listPolicies(TENANT);

        ArgumentCaptor<Map<String, Object>> inserted = ArgumentCaptor.forClass(Map.class);
        verify(dao, times(3)).insertPolicy(inserted.capture());
        Map<String, Map<String, Object>> byCode = new HashMap<String, Map<String, Object>>();
        for (Map<String, Object> params : inserted.getAllValues()) {
            byCode.put((String) params.get("policyCode"), params);
        }
        assertThat(byCode).containsOnlyKeys("LOGIN_LOCK_ENABLED", "LOGIN_LOCK_MAX_ATTEMPTS", "PROFILE_PHOTO_EDIT_MODE");
        assertThat(byCode.get("LOGIN_LOCK_ENABLED")).containsEntry("valueType", "BOOLEAN").containsEntry("valueJson", "false");
        assertThat(byCode.get("LOGIN_LOCK_MAX_ATTEMPTS")).containsEntry("valueType", "NUMBER")
                .containsEntry("valueJson", "5").containsEntry("unit", "회");
        assertThat(byCode.get("PROFILE_PHOTO_EDIT_MODE")).containsEntry("valueType", "SELECT")
                .containsEntry("valueJson", "\"SELF\"");
        verify(dao, times(3)).insertPolicyHistory(anyMap());
        org.mockito.InOrder order = org.mockito.Mockito.inOrder(dao);
        order.verify(dao, times(3)).insertPolicy(anyMap());
        order.verify(dao).selectPolicyList(TENANT);
    }

    @Test
    void listDoesNotRecreatePoliciesThatAlreadyExist() throws Exception {
        when(dao.selectPolicyIdByCode(anyMap())).thenReturn(7L);
        when(dao.selectPolicyList(TENANT)).thenReturn(Collections.emptyList());

        List<?> result = service.listPolicies(TENANT);

        assertThat(result).isEmpty();
        verify(dao, never()).insertPolicy(anyMap());
    }

    @Test
    void aRaceWithAnotherRequestCreatingTheSamePolicyIsIgnored() throws Exception {
        when(dao.selectPolicyIdByCode(anyMap())).thenReturn(null);
        when(dao.insertPolicy(anyMap())).thenThrow(new DuplicateKeyException("duplicate"));
        when(dao.selectPolicyList(TENANT)).thenReturn(Collections.emptyList());

        service.listPolicies(TENANT);

        verify(dao).selectPolicyList(TENANT);
        verify(dao, never()).insertPolicyHistory(anyMap());
    }
}
