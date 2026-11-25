package egovframework.let.system.policies.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import javax.servlet.Filter;
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
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.com.jwt.EgovJwtTokenUtil;
import egovframework.com.jwt.JwtAuthenticationEntryPoint;
import egovframework.com.security.SecurityConfig;
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.system.policies.service.impl.SystemPolicyServiceImpl;

/**
 * 실제 SecurityConfig 필터 체인과 JwtAuthenticationFilter, 실제로 서명한 JWT로 정책 API를 호출한다.
 * 전용 빈 DB sales_decimal_isolated_test에서만 실행하며 SALES_DECIMAL_TEST_PASSWORD로 비밀번호를 받는다.
 */
@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = SystemPolicySecurityApiPostgresIntegrationTest.Config.class)
@EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_TEST_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/sales_decimal_isolated_test")
class SystemPolicySecurityApiPostgresIntegrationTest {
    private static final String BASE = "/api/v1/system/policies";

    @Configuration
    @EnableWebMvc
    @EnableTransactionManagement
    @Import({ SecurityConfig.class, EgovJwtTokenUtil.class, JwtAuthenticationEntryPoint.class,
            egovframework.com.cmm.util.ResultVoHelper.class, SystemPolicyApiController.class })
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

    @Autowired private WebApplicationContext context;
    @Autowired private EgovJwtTokenUtil tokens;
    @Autowired private SystemPolicyService service;
    private MockMvc mvc;
    private static long policyId = -1;

    @BeforeEach
    void setup() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        if (policyId < 0) {
            SystemPolicySaveRequestVO request = new SystemPolicySaveRequestVO();
            request.setPolicyCode("GRID_DECIMAL_SEC");
            request.setPolicyName("영업 소수점");
            request.setCategory("영업관리");
            request.setValueType("NUMBER");
            request.setMinValue(java.math.BigDecimal.ZERO);
            request.setMaxValue(java.math.BigDecimal.valueOf(6));
            request.setValue(new com.fasterxml.jackson.databind.ObjectMapper().readTree(typed(2)));
            policyId = service.createPolicy(71L, 5L, request).getPolicyId();
        }
    }

    private String token(String roleCode, boolean passwordChangeRequired) {
        LoginVO user = new LoginVO();
        user.setId("tester");
        user.setName("tester");
        user.setUniqId("5");
        user.setTenantId(71L);
        user.setTenantCode("T71");
        user.setRoleCode(roleCode);
        user.setPasswordChangeRequired(passwordChangeRequired);
        return tokens.generateToken(user);
    }

    private static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    private static String body(int version, int currencyPlaces) {
        return "{\"policyCode\":\"GRID_DECIMAL_SEC\",\"policyName\":\"영업 소수점\",\"category\":\"영업관리\","
                + "\"valueType\":\"NUMBER\",\"minValue\":0,\"maxValue\":6,\"version\":" + version
                + ",\"value\":" + typed(currencyPlaces) + "}";
    }

    private static String typed(int currencyPlaces) {
        return "{\"number\":{\"places\":0,\"trailingZeros\":\"AUTO\",\"rounding\":\"HALF_UP\"},"
                + "\"decimal\":{\"places\":3,\"trailingZeros\":\"AUTO\",\"rounding\":\"DOWN\"},"
                + "\"currency\":{\"places\":" + currencyPlaces + ",\"trailingZeros\":\"FIXED\",\"rounding\":\"HALF_UP\"}}";
    }

    @Test
    void securityFilterChainRejectsMissingAndInvalidTokensBeforeTheController() throws Exception {
        mvc.perform(get(BASE + "/grid-decimals")).andExpect(status().isUnauthorized());
        mvc.perform(put(BASE + "/" + policyId).contentType(MediaType.APPLICATION_JSON).content(body(1, 4)))
                .andExpect(status().isUnauthorized());
        String valid = token("PLATFORM_ADMIN", false);
        mvc.perform(bearer(get(BASE + "/grid-decimals"), valid.substring(0, valid.length() - 3) + "abc"))
                .andExpect(status().isUnauthorized());
        mvc.perform(bearer(get(BASE + "/grid-decimals"), "not.a.jwt")).andExpect(status().isUnauthorized());
        // 정책 값이 저장되지 않았다.
        mvc.perform(bearer(get(BASE + "/grid-decimals"), valid))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.SEC.currency.places").value(2));
    }

    @Test
    void signedTokensDriveRolesTenantAndSaveFlowThroughTheRealFilters() throws Exception {
        String user = token("TENANT_USER", false);
        String admin = token("PLATFORM_ADMIN", false);

        mvc.perform(bearer(get(BASE + "/grid-decimals"), user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.SEC.decimal.rounding").value("DOWN"));
        mvc.perform(bearer(get(BASE), user)).andExpect(status().isForbidden());
        mvc.perform(bearer(put(BASE + "/" + policyId).contentType(MediaType.APPLICATION_JSON).content(body(1, 4)), user))
                .andExpect(status().isForbidden());

        mvc.perform(bearer(put(BASE + "/" + policyId).contentType(MediaType.APPLICATION_JSON).content(body(1, 4)), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").value("정책이 저장되었습니다."))
                .andExpect(jsonPath("$.result.item.version").value(2));
        mvc.perform(bearer(put(BASE + "/" + policyId).contentType(MediaType.APPLICATION_JSON).content(body(1, 3)), admin))
                .andExpect(status().isConflict());
        mvc.perform(bearer(get(BASE + "/" + policyId + "/history"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].action").value("UPDATE"))
                .andExpect(jsonPath("$.result.resultList[0].changedBy").value("tester"))
                .andExpect(jsonPath("$.result.resultList[0].afterValue.currency.places").value(4));
    }

    @Test
    void passwordChangeRequiredTokensCannotUseThePolicyApi() throws Exception {
        String pending = token("PLATFORM_ADMIN", true);
        mvc.perform(bearer(get(BASE + "/grid-decimals"), pending))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.resultCode").value("PASSWORD_CHANGE_REQUIRED"));
        mvc.perform(bearer(put(BASE + "/" + policyId).contentType(MediaType.APPLICATION_JSON).content(body(2, 5)), pending))
                .andExpect(status().isForbidden());
    }
}
