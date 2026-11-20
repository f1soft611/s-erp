package egovframework.let.system.accounts.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.accounts.domain.model.AccountPasswordResetVO;
import egovframework.let.system.accounts.domain.model.AccountRoleVO;
import egovframework.let.system.accounts.domain.model.AccountVO;
import egovframework.let.system.accounts.domain.repository.AccountDAO;
import egovframework.let.utl.sim.service.EgovFileScrty;

class AccountServiceImplTest {

    private static final Long TENANT = 1L;
    private static final Long ACTOR_USER = 9L;
    private static final String ACTOR_LOGIN = "admin";
    private static final Long TARGET = 55L;

    @Mock
    private AccountDAO accountDAO;

    private AccountServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new AccountServiceImpl(accountDAO);
        when(accountDAO.selectAccountById(anyMap())).thenReturn(account(TARGET, "hong.gd"));
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Collections.singletonList(role(TARGET, 4L, "DEFAULT_USER")));
        when(accountDAO.selectOtherAdminCount(anyMap())).thenReturn(1);
        when(accountDAO.updateUseAt(anyMap())).thenReturn(1);
        when(accountDAO.updatePasswordReset(anyMap())).thenReturn(1);
        when(accountDAO.updateUnlock(anyMap())).thenReturn(1);
    }

    private static AccountVO account(Long loginId, String loginCode) {
        AccountVO vo = new AccountVO();
        vo.setLoginId(loginId);
        vo.setLoginCode(loginCode);
        vo.setUseAt("Y");
        return vo;
    }

    private static AccountRoleVO role(Long loginId, Long roleId, String roleCode) {
        AccountRoleVO vo = new AccountRoleVO();
        vo.setLoginId(loginId);
        vo.setRoleId(roleId);
        vo.setRoleCode(roleCode);
        vo.setRoleNm(roleCode);
        return vo;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> capture(String method) throws Exception {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        if ("updateUseAt".equals(method)) {
            verify(accountDAO).updateUseAt(captor.capture());
        } else if ("updatePasswordReset".equals(method)) {
            verify(accountDAO).updatePasswordReset(captor.capture());
        } else if ("updateUnlock".equals(method)) {
            verify(accountDAO).updateUnlock(captor.capture());
        }
        return captor.getValue();
    }

    private static void assertStatus(Throwable error, HttpStatus status) {
        assertThat(error).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatus()).isEqualTo(status));
    }

    // ---- 목록 ----

    @Test
    void listAttachesRolesPerAccountAndRejectsUnknownStatus() throws Exception {
        when(accountDAO.selectAccountList(anyMap())).thenReturn(Arrays.asList(account(55L, "a"), account(56L, "b")));
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Arrays.asList(
                role(55L, 4L, "DEFAULT_USER"), role(55L, 2L, "ADMIN"), role(56L, 4L, "DEFAULT_USER")));

        List<AccountVO> list = service.listAccounts(TENANT, " 홍 ", "all");

        assertThat(list.get(0).getRoles()).hasSize(2);
        assertThat(list.get(1).getRoles()).hasSize(1);
        assertThatThrownBy(() -> service.listAccounts(TENANT, null, "BROKEN"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void listPassesTrimmedKeywordAndUppercasedStatus() throws Exception {
        service.listAccounts(TENANT, " 홍 ", "locked");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(accountDAO).selectAccountList(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", TENANT)
                .containsEntry("keyword", "홍").containsEntry("status", "LOCKED");
    }

    // ---- 허용/미허용 ----

    @Test
    void disablingAnotherAccountWritesTheActor() throws Exception {
        service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, TARGET, "N");

        Map<String, Object> params = capture("updateUseAt");
        assertThat(params).containsEntry("tenantId", TENANT).containsEntry("loginId", TARGET)
                .containsEntry("useAt", "N").containsEntry("actorUserId", ACTOR_USER);
    }

    @Test
    void cannotDisableYourOwnAccount() throws Exception {
        when(accountDAO.selectAccountById(anyMap())).thenReturn(account(TARGET, ACTOR_LOGIN));

        assertThatThrownBy(() -> service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, TARGET, "N"))
                .satisfies(error -> assertStatus(error, HttpStatus.CONFLICT));
        verify(accountDAO, never()).updateUseAt(anyMap());
    }

    @Test
    void cannotDisableTheLastAdministrator() throws Exception {
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Collections.singletonList(role(TARGET, 2L, "ADMIN")));
        when(accountDAO.selectOtherAdminCount(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, TARGET, "N"))
                .satisfies(error -> assertStatus(error, HttpStatus.CONFLICT));
        verify(accountDAO, never()).updateUseAt(anyMap());
    }

    @Test
    void enablingNeverNeedsTheAdministratorCheck() throws Exception {
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Collections.singletonList(role(TARGET, 2L, "ADMIN")));
        when(accountDAO.selectOtherAdminCount(anyMap())).thenReturn(0);

        service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, TARGET, "Y");

        assertThat(capture("updateUseAt")).containsEntry("useAt", "Y");
    }

    @Test
    void rejectsAnInvalidUseFlag() {
        assertThatThrownBy(() -> service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, TARGET, "X"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unknownOrOtherTenantAccountIs404() throws Exception {
        when(accountDAO.selectAccountById(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.updateStatus(TENANT, ACTOR_USER, ACTOR_LOGIN, 999L, "N"))
                .satisfies(error -> assertStatus(error, HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> service.resetPassword(TENANT, ACTOR_USER, 999L))
                .satisfies(error -> assertStatus(error, HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> service.unlock(TENANT, ACTOR_USER, 999L))
                .satisfies(error -> assertStatus(error, HttpStatus.NOT_FOUND));
    }

    // ---- 비밀번호 초기화 ----

    @Test
    void resetStoresAHashedTemporaryPasswordAndForcesAChange() throws Exception {
        AccountPasswordResetVO result = service.resetPassword(TENANT, ACTOR_USER, TARGET);

        String temporary = result.getTemporaryPassword();
        assertThat(temporary).hasSize(12).matches(".*[A-Z].*").matches(".*[a-z].*").matches(".*[0-9].*")
                .doesNotContain("0", "O", "o", "1", "l", "I");
        assertThat(result.getLoginCode()).isEqualTo("hong.gd");
        Map<String, Object> params = capture("updatePasswordReset");
        assertThat(params).containsEntry("passwordHash", EgovFileScrty.encryptPassword(temporary, "hong.gd"))
                .containsEntry("actorUserId", ACTOR_USER).containsEntry("loginId", TARGET);
        assertThat(params.values()).doesNotContain(temporary);
    }

    @Test
    void eachResetProducesADifferentPassword() throws Exception {
        String first = service.resetPassword(TENANT, ACTOR_USER, TARGET).getTemporaryPassword();
        String second = service.resetPassword(TENANT, ACTOR_USER, TARGET).getTemporaryPassword();

        assertThat(first).isNotEqualTo(second);
    }

    // ---- 잠금 해제 ----

    @Test
    void unlockClearsTheLockForTheTenantAccount() throws Exception {
        service.unlock(TENANT, ACTOR_USER, TARGET);

        assertThat(capture("updateUnlock")).containsEntry("tenantId", TENANT)
                .containsEntry("loginId", TARGET).containsEntry("actorUserId", ACTOR_USER);
    }

    // ---- 역할 ----

    @Test
    void replacesRolesWithTheUsableRolesOfTheTenant() throws Exception {
        when(accountDAO.selectUsableRoleCodes(anyMap())).thenReturn(Arrays.asList("DEFAULT_USER", "ROLE_INFO_MANAGER"));

        service.updateRoles(TENANT, ACTOR_USER, TARGET, Arrays.asList(4L, 3L, 4L));

        verify(accountDAO).deleteAccountRoles(anyMap());
        verify(accountDAO, org.mockito.Mockito.times(2)).insertAccountRole(anyMap());
    }

    @Test
    void rejectsEmptyOrUnusableRoles() throws Exception {
        assertThatThrownBy(() -> service.updateRoles(TENANT, ACTOR_USER, TARGET, Collections.<Long>emptyList()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.updateRoles(TENANT, ACTOR_USER, TARGET, null))
                .isInstanceOf(IllegalArgumentException.class);

        when(accountDAO.selectUsableRoleCodes(anyMap())).thenReturn(Collections.singletonList("DEFAULT_USER"));
        assertThatThrownBy(() -> service.updateRoles(TENANT, ACTOR_USER, TARGET, Arrays.asList(4L, 999L)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(accountDAO, never()).deleteAccountRoles(anyMap());
    }

    @Test
    void cannotRemoveTheAdministratorRoleFromTheLastAdministrator() throws Exception {
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Collections.singletonList(role(TARGET, 2L, "ADMIN")));
        when(accountDAO.selectOtherAdminCount(anyMap())).thenReturn(0);
        when(accountDAO.selectUsableRoleCodes(anyMap())).thenReturn(Collections.singletonList("DEFAULT_USER"));

        assertThatThrownBy(() -> service.updateRoles(TENANT, ACTOR_USER, TARGET, Collections.singletonList(4L)))
                .satisfies(error -> assertStatus(error, HttpStatus.CONFLICT));
        verify(accountDAO, never()).deleteAccountRoles(anyMap());
    }

    @Test
    void anAdministratorMayChangeRolesWhenAnotherAdministratorExists() throws Exception {
        when(accountDAO.selectAccountRoles(anyMap())).thenReturn(Collections.singletonList(role(TARGET, 2L, "ADMIN")));
        when(accountDAO.selectOtherAdminCount(anyMap())).thenReturn(1);
        when(accountDAO.selectUsableRoleCodes(anyMap())).thenReturn(Collections.singletonList("DEFAULT_USER"));

        service.updateRoles(TENANT, ACTOR_USER, TARGET, Collections.singletonList(4L));

        verify(accountDAO).deleteAccountRoles(anyMap());
    }
}
