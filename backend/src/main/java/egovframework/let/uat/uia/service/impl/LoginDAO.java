package egovframework.let.uat.uia.service.impl;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.domain.model.LoginLockStateVO;
import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;

import org.springframework.stereotype.Repository;

/**
 * 일반 로그인을 처리하는 비즈니스 구현 클래스
 * @author 공통서비스 개발팀 박지욱
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 * <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자          수정내용
 *  -------    --------    ---------------------------
 *  2009.03.06  박지욱          최초 생성
 *  2011.08.31  JJY            경량환경 템플릿 커스터마이징버전 생성
 *
 *  </pre>
 */
@Repository("loginDAO")
public class LoginDAO extends EgovAbstractMapper {

	/**
	 * 일반 로그인을 처리한다
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.actionLogin", vo);
	}

	/**
	 * 로그인 시도 계정의 실패 잠금 상태를 조회한다. 로그인 코드 또는 이메일로 찾으며 없으면 null.
	 */
	public LoginLockStateVO selectLockState(Long tenantId, String id) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("id", id);
		return selectOne("loginDAO.selectLockState", params);
	}

	/**
	 * 로그인 실패 횟수를 1 올리고 기준 횟수에 도달하면 잠근다(한 문장으로 처리해 동시 시도에도 안전하다).
	 */
	public int increaseFailedAttempt(Long tenantId, Long loginId, int maxAttempts) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("loginId", loginId);
		params.put("maxAttempts", maxAttempts);
		return update("loginDAO.increaseFailedAttempt", params);
	}

	/**
	 * 로그인에 성공했을 때 쌓인 실패 횟수를 지운다.
	 */
	public int resetFailedAttempts(Long loginId) throws Exception {
		return update("loginDAO.resetFailedAttempts", loginId);
	}

	/**
	 * 계정이 비밀번호를 변경해야 하는 상태인지 조회한다(계정이 없으면 false).
	 */
	public boolean isPasswordChangeRequired(Long tenantId, String loginCode) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("loginCode", loginCode);
		Boolean required = selectOne("loginDAO.selectPasswordChangeRequired", params);
		return Boolean.TRUE.equals(required);
	}

	/**
	 * 계정이 아직 로그인할 수 있는 상태인지 확인한다(허용·사용 중 사원·미퇴직).
	 * @param tenantId 테넌트 ID
	 * @param loginCode 로그인 코드
	 * @exception Exception
	 */
	public boolean isLoginable(Long tenantId, String loginCode) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("loginCode", loginCode);
		Integer count = selectOne("loginDAO.countLoginableAccount", params);
		return count != null && count.intValue() > 0;
	}

	/**
	 * 아이디를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO searchId(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.searchId", vo);
	}

	/**
	 * 비밀번호를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO searchPassword(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.searchPassword", vo);
	}

	/**
	 * 변경된 비밀번호를 저장한다.
	 * @param vo LoginVO
	 * @exception Exception
	 */
	public void updatePassword(LoginVO vo) throws Exception {
		update("loginDAO.updatePassword", vo);
	}

	/**
	 * 테넌트 내 이메일로 로그인 코드를 조회한다.
	 * @param tenantId 테넌트 ID
	 * @param email 이메일 주소
	 * @return 로그인 코드
	 * @exception Exception
	 */
	public String selectLoginCodeByTenantIdAndEmail(Long tenantId, String email) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("email", email);
		return (String) selectOne("loginDAO.selectLoginCodeByTenantIdAndEmail", params);
	}

	/**
	 * 테넌트 코드로 테넌트 ID를 조회한다.
	 * @param tenantCode 테넌트 코드
	 * @return 테넌트 ID
	 * @exception Exception
	 */
	public Long selectTenantIdByCode(String tenantCode) throws Exception {
		return (Long) selectOne("loginDAO.selectTenantIdByCode", tenantCode);
	}
}
