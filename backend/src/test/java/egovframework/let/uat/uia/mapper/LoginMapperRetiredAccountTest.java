package egovframework.let.uat.uia.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;

/** 퇴직일이 지난 사원은 로그인·프로필 조회·토큰 갱신 확인에서 제외된다. 퇴직일을 지우면 다시 로그인할 수 있다(상태 저장 없음). */
class LoginMapperRetiredAccountTest {

    private static final String RETIRED = "NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)";

    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private String sql(String id, Object params) {
        return configuration.getMappedStatement("loginDAO." + id).getBoundSql(params)
                .getSql().replaceAll("\\s+", " ").trim();
    }

    @Test
    void loginExcludesRetiredEmployees() {
        LoginVO vo = new LoginVO();
        vo.setId("hong.gd");
        vo.setPassword("hash");
        vo.setTenantId(1L);

        assertThat(sql("actionLogin", vo)).contains(RETIRED);
    }

    @Test
    void currentProfileExcludesRetiredEmployees() {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 1L);
        params.put("loginCode", "hong.gd");

        assertThat(sql("selectMyProfile", params)).contains(RETIRED);
    }

    @Test
    void loginReturnsThePasswordChangeRequiredFlagAndChangingThePasswordClearsIt() {
        LoginVO vo = new LoginVO();
        vo.setId("hong.gd");
        vo.setPassword("hash");
        vo.setTenantId(1L);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 1L);
        params.put("loginCode", "hong.gd");
        params.put("password", "new-hash");

        assertThat(sql("actionLogin", vo)).contains("(li.password_change_required = 'Y') AS passwordChangeRequired");
        assertThat(sql("updateCurrentPassword", params))
                .contains("password_changed_at = now()").contains("password_change_required = 'N'");
        assertThat(sql("selectPasswordChangeRequired", params))
                .contains("(li.password_change_required = 'Y')").contains("li.tenant_id = CAST(? AS bigint)");
    }

    @Test
    void loginableCheckRequiresAnAllowedActiveNonRetiredAccountOfTheTenant() {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 1L);
        params.put("loginCode", "hong.gd");

        assertThat(sql("countLoginableAccount", params))
                .contains("li.tenant_id = CAST(? AS bigint)").contains("li.login_code = ?")
                .contains("COALESCE(li.use_at, 'Y') = 'Y'").contains("COALESCE(u.use_at, 'Y') = 'Y'")
                .contains(RETIRED);
    }
}
