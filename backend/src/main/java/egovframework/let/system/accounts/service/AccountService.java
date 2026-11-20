package egovframework.let.system.accounts.service;

import java.util.List;

import egovframework.let.system.accounts.domain.model.AccountPasswordResetVO;
import egovframework.let.system.accounts.domain.model.AccountVO;

/** 계정관리(허용/미허용, 비밀번호 초기화, 잠금 해제, 역할). 계정 발급은 사원관리에서 한다. */
public interface AccountService {

    /** status: ALL, ACTIVE, DISABLED, LOCKED, RETIRED(비어 있으면 ALL). */
    List<AccountVO> listAccounts(Long tenantId, String keyword, String status) throws Exception;

    AccountVO updateStatus(Long tenantId, Long actorUserId, String actorLoginCode, Long loginId, String useAt)
            throws Exception;

    AccountPasswordResetVO resetPassword(Long tenantId, Long actorUserId, Long loginId) throws Exception;

    AccountVO unlock(Long tenantId, Long actorUserId, Long loginId) throws Exception;

    AccountVO updateRoles(Long tenantId, Long actorUserId, Long loginId, List<Long> roleIds) throws Exception;
}
