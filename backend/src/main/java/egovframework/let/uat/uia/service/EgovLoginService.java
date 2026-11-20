package egovframework.let.uat.uia.service;

import egovframework.com.cmm.LoginVO;

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
public interface EgovLoginService {

	/**
	 * 일반 로그인을 처리한다
	 * @return LoginVO
	 *
	 * @param vo    LoginVO
	 * @exception Exception Exception
	 */
	public LoginVO actionLogin(LoginVO vo) throws Exception;

	/**
	 * 아이디를 찾는다.
	 * @return LoginVO
	 *
	 * @param vo    LoginVO
	 * @exception Exception Exception
	 */
	public LoginVO searchId(LoginVO vo) throws Exception;

	/**
	 * 비밀번호를 찾는다.
	 * @return boolean
	 *
	 * @param vo    LoginVO
	 * @exception Exception Exception
	 */
	public boolean searchPassword(LoginVO vo) throws Exception;

	/**
	 * 토큰 갱신 등에서 계정이 아직 로그인할 수 있는 상태(허용·사용 중 사원·미퇴직)인지 확인한다.
	 * @param tenantId 테넌트 ID
	 * @param loginCode 로그인 코드
	 * @exception Exception Exception
	 */
	public boolean isLoginable(Long tenantId, String loginCode) throws Exception;

	/**
	 * 계정이 비밀번호를 변경해야 하는 상태(초기화·최초 발급 후)인지 확인한다. 토큰 갱신 때 새 토큰에 반영한다.
	 * @param tenantId 테넌트 ID
	 * @param loginCode 로그인 코드
	 * @exception Exception Exception
	 */
	public boolean isPasswordChangeRequired(Long tenantId, String loginCode) throws Exception;

}