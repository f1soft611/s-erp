package egovframework.let.system.accounts.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.accounts.domain.model.AccountRoleVO;
import egovframework.let.system.accounts.domain.model.AccountVO;

@Repository("accountDAO")
public class AccountDAO extends EgovAbstractMapper {

    public List<AccountVO> selectAccountList(Map<String, Object> params) throws Exception {
        return selectList("AccountDAO.selectAccountList", params);
    }

    public AccountVO selectAccountById(Map<String, Object> params) throws Exception {
        return selectOne("AccountDAO.selectAccountById", params);
    }

    /** 테넌트 계정의 역할. loginId를 주면 그 계정만 조회한다. */
    public List<AccountRoleVO> selectAccountRoles(Map<String, Object> params) throws Exception {
        return selectList("AccountDAO.selectAccountRoles", params);
    }

    /** 대상 계정 외에 관리자 역할을 가진 사용 중인 계정 수. */
    public int selectOtherAdminCount(Map<String, Object> params) throws Exception {
        return count("AccountDAO.selectOtherAdminCount", params);
    }

    /** roleIds 중 같은 테넌트에서 사용 중인 역할의 코드. */
    public List<String> selectUsableRoleCodes(Map<String, Object> params) throws Exception {
        return selectList("AccountDAO.selectUsableRoleCodes", params);
    }

    public int updateUseAt(Map<String, Object> params) throws Exception {
        return update("AccountDAO.updateUseAt", params);
    }

    public int updatePasswordReset(Map<String, Object> params) throws Exception {
        return update("AccountDAO.updatePasswordReset", params);
    }

    public int updateUnlock(Map<String, Object> params) throws Exception {
        return update("AccountDAO.updateUnlock", params);
    }

    public int deleteAccountRoles(Map<String, Object> params) throws Exception {
        return delete("AccountDAO.deleteAccountRoles", params);
    }

    public void insertAccountRole(Map<String, Object> params) throws Exception {
        insert("AccountDAO.insertAccountRole", params);
    }

    /** 역할 변경처럼 계정 행을 직접 바꾸지 않는 처리에서 수정 시각·수정자만 남긴다. */
    public int touchAccount(Map<String, Object> params) throws Exception {
        return update("AccountDAO.touchAccount", params);
    }

    private int count(String statement, Map<String, Object> params) throws Exception {
        Integer value = selectOne(statement, params);
        return value == null ? 0 : value;
    }
}
