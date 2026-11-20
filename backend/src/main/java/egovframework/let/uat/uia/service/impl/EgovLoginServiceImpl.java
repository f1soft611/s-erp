package egovframework.let.uat.uia.service.impl;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.policies.domain.model.LoginLockPolicyVO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.uat.uia.domain.model.LoginLockStateVO;
import egovframework.let.uat.uia.service.EgovLoginService;
import egovframework.let.utl.fcc.service.EgovNumberUtil;
import egovframework.let.utl.fcc.service.EgovStringUtil;
import egovframework.let.utl.sim.service.EgovFileScrty;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;

import javax.annotation.Resource;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import lombok.extern.slf4j.Slf4j;

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
 *  2026.06.23  AI             다중 테넌트 지원 - TenantContextHolder 통합
 *
 *  </pre>
 */
@Slf4j
@Service("loginService")
public class EgovLoginServiceImpl extends EgovAbstractServiceImpl implements EgovLoginService {

	@Resource(name = "loginDAO")
	private LoginDAO loginDAO;

	@Resource(name = "systemPolicyService")
	private SystemPolicyService systemPolicyService;

	/**
	 * 일반 로그인을 처리한다
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		if (vo == null) {
			return null;
		}

		String inputId = vo.getId();
		if (inputId != null) {
			inputId = inputId.trim();
			vo.setId(inputId);
		}
		String plainPassword = vo.getPassword();
		if (plainPassword == null) {
			plainPassword = "";
		}

		if (vo.getTenantId() == null && vo.getTenantCode() != null && !vo.getTenantCode().trim().isEmpty()) {
			Long tenantId = loginDAO.selectTenantIdByCode(vo.getTenantCode().trim());
			if (tenantId == null) {
				log.warn("Login failed: unknown tenantCode={}", vo.getTenantCode());
				return new LoginVO();
			}
			vo.setTenantId(tenantId);
		}

		String enpassword = EgovFileScrty.encryptPassword(plainPassword, vo.getId());
		vo.setPassword(enpassword);

		// 로그인 실패 잠금: 정책이 미사용이면 아래 조회·누적을 전혀 하지 않아 이전 동작과 같다.
		LoginLockStateVO lockState = null;
		LoginLockPolicyVO lockPolicy = loginLockPolicy(vo.getTenantId());
		if (lockPolicy.isEnabled()) {
			lockState = loginDAO.selectLockState(vo.getTenantId(), vo.getId());
			if (lockState != null && lockState.isLocked()) {
				log.warn("Login rejected: locked account userId={}", vo.getId());
				LoginVO locked = new LoginVO();
				locked.setAccountLocked(true);
				return locked;
			}
		}

		LoginVO loginVO = loginDAO.actionLogin(vo);
		if (isValidLogin(loginVO)) {
			if (lockState != null && lockState.getAttemptCount() > 0) {
				loginDAO.resetFailedAttempts(lockState.getLoginId());
			}
			log.info("Login successful: userId={}", loginVO.getId());
			return loginVO;
		}

		if (lockState != null) {
			loginDAO.increaseFailedAttempt(vo.getTenantId(), lockState.getLoginId(), lockPolicy.getMaxAttempts());
		}
		log.warn("Login failed: userId={}", vo.getId());
		return new LoginVO();
	}

	/** 정책을 읽지 못하거나 테넌트를 알 수 없으면 잠금을 쓰지 않는 것으로 본다(로그인을 막지 않는다). */
	private LoginLockPolicyVO loginLockPolicy(Long tenantId) {
		if (systemPolicyService == null || tenantId == null) {
			return LoginLockPolicyVO.disabled();
		}
		try {
			LoginLockPolicyVO policy = systemPolicyService.getLoginLockPolicy(tenantId);
			return policy == null ? LoginLockPolicyVO.disabled() : policy;
		} catch (Exception e) {
			log.warn("Login lock policy could not be read: tenantId={}", tenantId, e);
			return LoginLockPolicyVO.disabled();
		}
	}

	@Override
	public boolean isLoginable(Long tenantId, String loginCode) throws Exception {
		if (tenantId == null || loginCode == null || loginCode.trim().isEmpty()) {
			return false;
		}
		return loginDAO.isLoginable(tenantId, loginCode.trim());
	}

	@Override
	public boolean isPasswordChangeRequired(Long tenantId, String loginCode) throws Exception {
		if (tenantId == null || loginCode == null || loginCode.trim().isEmpty()) {
			return false;
		}
		return loginDAO.isPasswordChangeRequired(tenantId, loginCode.trim());
	}

	private boolean isValidLogin(LoginVO loginVO) {
		return loginVO != null
				&& loginVO.getId() != null
				&& !loginVO.getId().isEmpty()
				&& loginVO.getPassword() != null
				&& !loginVO.getPassword().isEmpty();
	}

	private boolean isEmailFormat(String value) {
		return value != null && value.contains("@") && value.indexOf('@') > 0 && value.indexOf('@') < value.length() - 1;
	}

	private String extractLocalPart(String value) {
		if (!isEmailFormat(value)) {
			return null;
		}

		int atIndex = value.indexOf('@');
		if (atIndex <= 0) {
			return null;
		}

		String localPart = value.substring(0, atIndex).trim();
		if (localPart.isEmpty()) {
			return null;
		}
		return localPart;
	}


	/**
	 * 아이디를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO searchId(LoginVO vo) throws Exception {

		// 1. 이름, 이메일주소가 DB와 일치하는 사용자 ID를 조회한다.
		LoginVO loginVO = loginDAO.searchId(vo);

		// 2. 결과를 리턴한다.
		if (loginVO != null && !loginVO.getId().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * 비밀번호를 찾는다.
	 * @param vo LoginVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean searchPassword(LoginVO vo) throws Exception {

		boolean result = true;

		// 1. 아이디, 이름, 이메일주소, 비밀번호 힌트, 비밀번호 정답이 DB와 일치하는 사용자 Password를 조회한다.
		LoginVO loginVO = loginDAO.searchPassword(vo);
		if (loginVO == null || loginVO.getPassword() == null || loginVO.getPassword().equals("")) {
			return false;
		}

		// 2. 임시 비밀번호를 생성한다.(영+영+숫+영+영+숫=6자리)
		String newpassword = "";
		for (int i = 1; i <= 6; i++) {
			// 영자
			if (i % 3 != 0) {
				newpassword += EgovStringUtil.getRandomStr('a', 'z');
				// 숫자
			} else {
				newpassword += EgovNumberUtil.getRandomNum(0, 9);
			}
		}

		// 3. 임시 비밀번호를 암호화하여 DB에 저장한다.
		LoginVO pwVO = new LoginVO();
		String enpassword = EgovFileScrty.encryptPassword(newpassword, vo.getId());
		pwVO.setId(vo.getId());
		pwVO.setPassword(enpassword);
		pwVO.setUserSe(vo.getUserSe());
		loginDAO.updatePassword(pwVO);

		return result;
	}
}