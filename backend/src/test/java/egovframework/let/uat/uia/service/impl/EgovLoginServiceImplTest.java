package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.let.utl.sim.service.EgovFileScrty;

class EgovLoginServiceImplTest {

	@DisplayName("로그인 요청은 비밀번호를 암호화한 뒤 DAO에 전달하고 결과를 반환한다")
	@Test
	void actionLogin_encryptsPasswordAndReturnsAuthenticatedUser() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		EgovLoginServiceImpl service = new EgovLoginServiceImpl();
		ReflectionTestUtils.setField(service, "loginDAO", loginDAO);

		LoginVO storedLoginVO = new LoginVO();
		storedLoginVO.setId("admin");
		storedLoginVO.setPassword("encoded-password");
		when(loginDAO.actionLogin(any(LoginVO.class))).thenAnswer(invocation -> {
			LoginVO requestVO = invocation.getArgument(0);
			assertEquals(EgovFileScrty.encryptPassword("plain-password", "admin"), requestVO.getPassword());
			return storedLoginVO;
		});

		LoginVO requestVO = new LoginVO();
		requestVO.setId("admin");
		requestVO.setPassword("plain-password");

		LoginVO result = service.actionLogin(requestVO);

		assertNotNull(result);
		assertEquals("admin", result.getId());
		assertEquals("encoded-password", result.getPassword());
	}

	@DisplayName("로그인 실패 시 빈 LoginVO를 반환한다")
	@Test
	void actionLogin_returnsEmptyVoWhenUserNotFound() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		EgovLoginServiceImpl service = new EgovLoginServiceImpl();
		ReflectionTestUtils.setField(service, "loginDAO", loginDAO);
		when(loginDAO.actionLogin(any(LoginVO.class))).thenReturn(null);

		LoginVO requestVO = new LoginVO();
		requestVO.setId("unknown");
		requestVO.setPassword("plain-password");

		LoginVO result = service.actionLogin(requestVO);

		assertNotNull(result);
		assertNull(result.getId());
	}

	@DisplayName("tenantId가 없으면 PostgreSQL 로그인 SQL은 tenant 조건을 건너뛴다")
	@Test
	void actionLogin_sql_skipsTenantFilterWhenTenantIdMissing() throws IOException {
		try (InputStream inputStream = getClass().getClassLoader()
				.getResourceAsStream("egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml")) {
			assertNotNull(inputStream, "로그인 SQL XML 리소스가 존재해야 합니다.");
			String xml = new String(readAllBytes(inputStream), StandardCharsets.UTF_8);
			assertTrue(xml.contains("<if test=\"tenantId != null\">"), "tenantId가 있을 때만 테넌트 조건을 추가해야 합니다.");
			assertTrue(xml.contains("<if test=\"tenantId == null and tenantCode != null and tenantCode != ''\">"), "tenantCode 기반 fallback 조건이 필요합니다.");
		}
	}

	private byte[] readAllBytes(InputStream inputStream) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		byte[] data = new byte[4096];
		int bytesRead;
		while ((bytesRead = inputStream.read(data)) != -1) {
			buffer.write(data, 0, bytesRead);
		}
		return buffer.toByteArray();
	}

	@DisplayName("tenantId는 Long 값으로 유지된다")
	@Test
	void setTenantId_keepsLongValue() {
		LoginVO loginVO = new LoginVO();
		loginVO.setTenantId(42L);

		assertEquals(42L, loginVO.getTenantId());
	}
}