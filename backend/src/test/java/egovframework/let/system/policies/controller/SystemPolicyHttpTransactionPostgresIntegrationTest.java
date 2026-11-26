package egovframework.let.system.policies.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import javax.sql.DataSource;

import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.system.policies.service.impl.SystemPolicyServiceImpl;

/**
 * 정책 API의 HTTP 계층(권한·상태 코드·응답 구조)과 서비스의 @Transactional 롤백을 실제 PostgreSQL에서 확인한다.
 * 전용 빈 DB sales_decimal_isolated_test에서만 실행하며 SALES_DECIMAL_TEST_PASSWORD로 비밀번호를 받는다.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = SystemPolicyHttpTransactionPostgresIntegrationTest.Config.class)
@EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_TEST_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/sales_decimal_isolated_test")
class SystemPolicyHttpTransactionPostgresIntegrationTest {
    private static final String BASE = "/api/v1/system/policies";

    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean
        DataSource dataSource() throws Exception {
            DriverManagerDataSource source = new DriverManagerDataSource(System.getenv("SALES_DECIMAL_TEST_URL"),
                    "postgres", System.getenv().getOrDefault("SALES_DECIMAL_TEST_PASSWORD", ""));
            JdbcTemplate jdbc = new JdbcTemplate(source);
            if (!"sales_decimal_isolated_test".equals(jdbc.queryForObject("SELECT current_database()", String.class))) {
                throw new IllegalStateException("An isolated test database is required");
            }
            for (String table : new String[] { "tb_system_policy_history", "tb_system_policy", "tb_user", "tb_tenant" }) {
                jdbc.execute("DROP TABLE IF EXISTS " + table + " CASCADE");
            }
            jdbc.execute("DROP FUNCTION IF EXISTS fail_rollback_history() CASCADE");
            jdbc.execute("CREATE TABLE tb_tenant (tenant_id bigint PRIMARY KEY, delivery_plan_mode text, over_delivery_policy text)");
            jdbc.execute("CREATE TABLE tb_user (user_id bigint, tenant_id bigint, user_nm text)");
            jdbc.update("INSERT INTO tb_tenant VALUES (71, 'MANUAL', 'BLOCK')");
            jdbc.update("INSERT INTO tb_user VALUES (5, 71, 'tester')");
            for (String script : new String[] { "DATABASE/20261105/20261105_004_create_system_policy_schema.sql",
                    "DATABASE/20261117/20261117_010_alter_grid_decimal_value_shape.sql" }) {
                jdbc.execute(new String(Files.readAllBytes(Paths.get(script)), StandardCharsets.UTF_8));
            }
            // 롤백 검증용: 이 정책의 UPDATE 이력 INSERT만 실패시켜 정책 UPDATE 이후 단계의 오류를 만든다.
            jdbc.execute("CREATE FUNCTION fail_rollback_history() RETURNS trigger AS $f$ BEGIN "
                    + "IF NEW.policy_code = 'GRID_DECIMAL_ROLLBACK' AND NEW.action_cd = 'UPDATE' THEN "
                    + "RAISE EXCEPTION 'forced history failure'; END IF; RETURN NEW; END; $f$ LANGUAGE plpgsql");
            jdbc.execute("CREATE TRIGGER trg_fail_rollback_history BEFORE INSERT ON tb_system_policy_history "
                    + "FOR EACH ROW EXECUTE FUNCTION fail_rollback_history()");
            return source;
        }

        @Bean
        org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace leaveaTrace() {
            return org.mockito.Mockito.mock(org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace.class);
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource source) {
            return new DataSourceTransactionManager(source);
        }

        @Bean(name = "sqlSession")
        SqlSessionFactory sqlSessionFactory(DataSource source) throws Exception {
            SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
            factory.setDataSource(source);
            factory.setConfigLocation(new ClassPathResource("egovframework/mapper/config/mapper-config.xml"));
            factory.setMapperLocations(new ClassPathResource(
                    "egovframework/mapper/let/system/policies/EgovSystemPolicy_SQL_postgresql.xml"));
            return factory.getObject();
        }

        @Bean
        SystemPolicyDAO dao(SqlSessionFactory factory) {
            SystemPolicyDAO dao = new SystemPolicyDAO();
            dao.setSqlSessionFactory(factory);
            return dao;
        }

        @Bean
        SystemPolicyService systemPolicyService(SystemPolicyDAO dao) {
            return new SystemPolicyServiceImpl(dao);
        }
    }

    @Autowired private SystemPolicyService service;
    @Autowired private DataSource dataSource;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new SystemPolicyApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory binder) {
                        return request.getUserPrincipal() == null ? null
                                : ((UsernamePasswordAuthenticationToken) request.getUserPrincipal()).getPrincipal();
                    }
                }).build();
    }

    private static MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder builder, String role) {
        LoginVO user = new LoginVO();
        user.setTenantId(71L);
        user.setId("tester");
        user.setUniqId("5");
        user.setRoleCode(role);
        return builder.principal(new UsernamePasswordAuthenticationToken(user, null));
    }

    private static String body(String code, Integer version, String valueJson) {
        return "{\"policyCode\":\"" + code + "\",\"policyName\":\"영업 소수점\",\"category\":\"영업관리\","
                + "\"valueType\":\"NUMBER\",\"minValue\":0,\"maxValue\":6,\"version\":" + version
                + ",\"value\":" + valueJson + "}";
    }

    private static String typed(int currencyPlaces) {
        return "{\"number\":{\"places\":0,\"trailingZeros\":\"AUTO\",\"rounding\":\"HALF_UP\"},"
                + "\"decimal\":{\"places\":3,\"trailingZeros\":\"AUTO\",\"rounding\":\"DOWN\"},"
                + "\"currency\":{\"places\":" + currencyPlaces + ",\"trailingZeros\":\"FIXED\",\"rounding\":\"HALF_UP\"}}";
    }

    private long seed(String code) throws Exception {
        egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO request =
                new egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO();
        request.setPolicyCode(code);
        request.setPolicyName("영업 소수점");
        request.setCategory("영업관리");
        request.setValueType("NUMBER");
        request.setMinValue(java.math.BigDecimal.ZERO);
        request.setMaxValue(java.math.BigDecimal.valueOf(6));
        request.setValue(new com.fasterxml.jackson.databind.ObjectMapper().readTree(typed(2)));
        return service.createPolicy(71L, 5L, request).getPolicyId();
    }

    @Test
    void httpLayerEnforcesPermissionsStatusCodesAndResponseShape() throws Exception {
        long id = seed("GRID_DECIMAL_HTTP");
        String path = BASE + "/" + id;

        // 일반 사용자도 소수점 정책 조회는 가능하고, 관리 API는 PLATFORM_ADMIN만 가능하다.
        mvc.perform(as(get(BASE + "/grid-decimals"), "TENANT_USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.HTTP.currency.places").value(2))
                .andExpect(jsonPath("$.result.item.HTTP.decimal.rounding").value("DOWN"));
        mvc.perform(get(BASE + "/grid-decimals")).andExpect(status().isForbidden());
        mvc.perform(as(put(path).contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_HTTP", 1, typed(4))), "TENANT_USER")).andExpect(status().isForbidden());
        mvc.perform(put(path).contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_HTTP", 1, typed(4)))).andExpect(status().isForbidden());

        // 저장 성공: 200, 메시지, 새 버전과 값.
        mvc.perform(as(put(path).contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_HTTP", 1, typed(4))), "PLATFORM_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value(200))
                .andExpect(jsonPath("$.result.message").value("정책이 저장되었습니다."))
                .andExpect(jsonPath("$.result.item.version").value(2))
                .andExpect(jsonPath("$.result.item.value.currency.places").value(4));
        mvc.perform(as(get(BASE + "/grid-decimals"), "TENANT_USER"))
                .andExpect(jsonPath("$.result.item.HTTP.currency.places").value(4));

        // 실패: 오래된 버전 409, 잘못된 값 400. 저장값은 유지된다.
        mvc.perform(as(put(path).contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_HTTP", 1, typed(3))), "PLATFORM_ADMIN")).andExpect(status().isConflict());
        mvc.perform(as(put(path).contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_HTTP", 2, typed(9))), "PLATFORM_ADMIN")).andExpect(status().isBadRequest());
        mvc.perform(as(get(BASE + "/grid-decimals"), "TENANT_USER"))
                .andExpect(jsonPath("$.result.item.HTTP.currency.places").value(4));

        // 이력 조회: 최신 UPDATE가 변경 전·후 값을 가진다.
        mvc.perform(as(get(path + "/history"), "PLATFORM_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].action").value("UPDATE"))
                .andExpect(jsonPath("$.result.resultList[0].beforeValue.currency.places").value(2))
                .andExpect(jsonPath("$.result.resultList[0].afterValue.currency.places").value(4))
                .andExpect(jsonPath("$.result.resultList[1].action").value("CREATE"));
        mvc.perform(as(get(path + "/history"), "TENANT_USER")).andExpect(status().isForbidden());
    }

    @Test
    void failureAfterThePolicyUpdateRollsTheWholeSaveBack() throws Exception {
        long id = seed("GRID_DECIMAL_ROLLBACK");
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        int historyBefore = jdbc.queryForObject(
                "SELECT count(*) FROM tb_system_policy_history WHERE policy_id = ?", Integer.class, id);

        // 정책 UPDATE는 성공하지만 이력 INSERT에서 DB 오류가 발생한다.
        Throwable failure = assertThrows(Throwable.class, () -> mvc.perform(as(put(BASE + "/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body("GRID_DECIMAL_ROLLBACK", 1, typed(4))), "PLATFORM_ADMIN")));
        assertThat(String.valueOf(failure) + String.valueOf(failure.getCause())).contains("forced history failure");

        // 값·버전·이력 모두 저장 전 상태여야 한다(@Transactional 롤백).
        assertThat(jdbc.queryForObject("SELECT version FROM tb_system_policy WHERE policy_id = ?", Integer.class, id))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT value_json->'currency'->>'places' FROM tb_system_policy WHERE policy_id = ?", String.class, id))
                .isEqualTo("2");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_system_policy_history WHERE policy_id = ?",
                Integer.class, id)).isEqualTo(historyBefore);
    }
}
