package egovframework.let.system.accounts.service.impl;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.accounts.domain.model.AccountPasswordResetVO;
import egovframework.let.system.accounts.domain.model.AccountRoleVO;
import egovframework.let.system.accounts.domain.model.AccountVO;
import egovframework.let.system.accounts.domain.repository.AccountDAO;
import egovframework.let.system.accounts.service.AccountService;
import egovframework.let.utl.sim.service.EgovFileScrty;

@Service("accountService")
public class AccountServiceImpl extends EgovAbstractServiceImpl implements AccountService {

    /** 관리자 역할 코드. 이 역할을 가진 마지막 사용 계정은 미허용·역할 제거를 할 수 없다. */
    static final Set<String> ADMIN_ROLE_CODES = Collections.unmodifiableSet(
            new HashSet<String>(Arrays.asList("PLATFORM_ADMIN", "TENANT_ADMIN", "ADMIN")));
    private static final Set<String> STATUSES = Collections.unmodifiableSet(
            new HashSet<String>(Arrays.asList("ALL", "ACTIVE", "DISABLED", "LOCKED", "RETIRED")));
    private static final int MAX_KEYWORD = 100;
    private static final int TEMP_PASSWORD_LENGTH = 12;
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
    private static final String DIGIT = "23456789";
    private static final String ALL = UPPER + LOWER + DIGIT;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AccountDAO accountDAO;

    public AccountServiceImpl(AccountDAO accountDAO) {
        this.accountDAO = accountDAO;
    }

    @Override
    public List<AccountVO> listAccounts(Long tenantId, String keyword, String status) throws Exception {
        validateTenantId(tenantId);
        String normalizedStatus = StringUtils.hasText(status) ? status.trim().toUpperCase(Locale.ROOT) : "ALL";
        if (!STATUSES.contains(normalizedStatus)) {
            throw new IllegalArgumentException("상태는 ALL, ACTIVE, DISABLED, LOCKED, RETIRED 중 하나여야 합니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("status", normalizedStatus);
        if (StringUtils.hasText(keyword)) {
            String trimmed = keyword.trim();
            params.put("keyword", trimmed.length() > MAX_KEYWORD ? trimmed.substring(0, MAX_KEYWORD) : trimmed);
        }
        List<AccountVO> accounts = accountDAO.selectAccountList(params);
        if (accounts == null) {
            return Collections.emptyList();
        }
        Map<String, Object> roleParams = new HashMap<String, Object>();
        roleParams.put("tenantId", tenantId);
        attachRoles(accounts, accountDAO.selectAccountRoles(roleParams));
        return accounts;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AccountVO updateStatus(Long tenantId, Long actorUserId, String actorLoginCode, Long loginId, String useAt)
            throws Exception {
        validateTenantId(tenantId);
        if (!"Y".equals(useAt) && !"N".equals(useAt)) {
            throw new IllegalArgumentException("허용 여부는 Y 또는 N이어야 합니다.");
        }
        AccountVO target = findOrThrow(tenantId, loginId);
        if ("N".equals(useAt)) {
            if (actorLoginCode != null && actorLoginCode.equals(target.getLoginCode())) {
                throw conflict("자기 자신의 계정은 미허용으로 바꿀 수 없습니다.");
            }
            if (holdsAdminRole(tenantId, loginId) && countOtherAdmins(tenantId, loginId) == 0) {
                throw conflict("마지막 관리자 계정은 미허용으로 바꿀 수 없습니다.");
            }
        }
        Map<String, Object> params = baseParams(tenantId, actorUserId, loginId);
        params.put("useAt", useAt);
        accountDAO.updateUseAt(params);
        return findOrThrow(tenantId, loginId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AccountPasswordResetVO resetPassword(Long tenantId, Long actorUserId, Long loginId) throws Exception {
        validateTenantId(tenantId);
        AccountVO target = findOrThrow(tenantId, loginId);
        String temporary = generateTemporaryPassword();
        Map<String, Object> params = baseParams(tenantId, actorUserId, loginId);
        params.put("passwordHash", EgovFileScrty.encryptPassword(temporary, target.getLoginCode()));
        accountDAO.updatePasswordReset(params);

        AccountPasswordResetVO result = new AccountPasswordResetVO();
        result.setLoginId(loginId);
        result.setLoginCode(target.getLoginCode());
        result.setTemporaryPassword(temporary);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AccountVO unlock(Long tenantId, Long actorUserId, Long loginId) throws Exception {
        validateTenantId(tenantId);
        findOrThrow(tenantId, loginId);
        accountDAO.updateUnlock(baseParams(tenantId, actorUserId, loginId));
        return findOrThrow(tenantId, loginId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AccountVO updateRoles(Long tenantId, Long actorUserId, Long loginId, List<Long> roleIds) throws Exception {
        validateTenantId(tenantId);
        if (roleIds == null || roleIds.isEmpty()) {
            throw new IllegalArgumentException("역할을 1개 이상 선택해 주세요.");
        }
        List<Long> distinct = new ArrayList<Long>(new LinkedHashSet<Long>(roleIds));
        for (Long roleId : distinct) {
            if (roleId == null) {
                throw new IllegalArgumentException("역할 정보가 올바르지 않습니다.");
            }
        }
        findOrThrow(tenantId, loginId);

        Map<String, Object> roleParams = new HashMap<String, Object>();
        roleParams.put("tenantId", tenantId);
        roleParams.put("roleIds", distinct);
        List<String> usableCodes = accountDAO.selectUsableRoleCodes(roleParams);
        if (usableCodes == null || usableCodes.size() != distinct.size()) {
            throw new IllegalArgumentException("사용할 수 없는 역할이 포함되어 있습니다.");
        }
        if (holdsAdminRole(tenantId, loginId) && !containsAdminCode(usableCodes)
                && countOtherAdmins(tenantId, loginId) == 0) {
            throw conflict("마지막 관리자 계정의 관리자 역할은 제거할 수 없습니다.");
        }

        accountDAO.deleteAccountRoles(baseParams(tenantId, actorUserId, loginId));
        for (Long roleId : distinct) {
            Map<String, Object> insertParams = baseParams(tenantId, actorUserId, loginId);
            insertParams.put("roleId", roleId);
            accountDAO.insertAccountRole(insertParams);
        }
        accountDAO.touchAccount(baseParams(tenantId, actorUserId, loginId));
        return findOrThrow(tenantId, loginId);
    }

    // ---- 내부 ----

    private AccountVO findOrThrow(Long tenantId, Long loginId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("loginId", loginId);
        AccountVO account = loginId == null ? null : accountDAO.selectAccountById(params);
        if (account == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "계정을 찾을 수 없습니다.");
        }
        Map<String, Object> roleParams = new HashMap<String, Object>(params);
        attachRoles(Collections.singletonList(account), accountDAO.selectAccountRoles(roleParams));
        return account;
    }

    private void attachRoles(List<AccountVO> accounts, List<AccountRoleVO> roles) {
        if (roles == null) {
            return;
        }
        for (AccountVO account : accounts) {
            List<AccountRoleVO> own = new ArrayList<AccountRoleVO>();
            for (AccountRoleVO role : roles) {
                if (role.getLoginId() != null && role.getLoginId().equals(account.getLoginId())) {
                    own.add(role);
                }
            }
            account.setRoles(own);
        }
    }

    private boolean holdsAdminRole(Long tenantId, Long loginId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("loginId", loginId);
        List<AccountRoleVO> roles = accountDAO.selectAccountRoles(params);
        if (roles != null) {
            for (AccountRoleVO role : roles) {
                if (ADMIN_ROLE_CODES.contains(role.getRoleCode())) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean containsAdminCode(List<String> codes) {
        for (String code : codes) {
            if (ADMIN_ROLE_CODES.contains(code)) {
                return true;
            }
        }
        return false;
    }

    private int countOtherAdmins(Long tenantId, Long loginId) throws Exception {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("loginId", loginId);
        params.put("adminRoleCodes", new ArrayList<String>(ADMIN_ROLE_CODES));
        return accountDAO.selectOtherAdminCount(params);
    }

    private Map<String, Object> baseParams(Long tenantId, Long actorUserId, Long loginId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("loginId", loginId);
        params.put("actorUserId", actorUserId);
        return params;
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    /** 대문자·소문자·숫자를 각 1자 이상 포함하고 혼동하기 쉬운 문자(0 O o 1 l I)를 뺀 12자. */
    static String generateTemporaryPassword() {
        char[] chars = new char[TEMP_PASSWORD_LENGTH];
        chars[0] = UPPER.charAt(RANDOM.nextInt(UPPER.length()));
        chars[1] = LOWER.charAt(RANDOM.nextInt(LOWER.length()));
        chars[2] = DIGIT.charAt(RANDOM.nextInt(DIGIT.length()));
        for (int i = 3; i < chars.length; i++) {
            chars[i] = ALL.charAt(RANDOM.nextInt(ALL.length()));
        }
        for (int i = chars.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }
}
