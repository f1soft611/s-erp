package egovframework.let.system.policies.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.DecimalPolicy;
import egovframework.let.system.policies.domain.model.SystemPolicyHistoryVO;
import egovframework.let.system.policies.domain.model.SystemPolicySaveRequestVO;
import egovframework.let.system.policies.domain.model.SystemPolicyVO;
import egovframework.let.system.policies.domain.repository.SystemPolicyDAO;

/**
 * 영업 소수점 정책(GRID_DECIMAL_SALES)의 저장·이력·실패·재시도를 실제 PostgreSQL에서 확인한다.
 * 전용 빈 DB sales_decimal_isolated_test에서만 실행하며 SALES_DECIMAL_TEST_PASSWORD로 비밀번호를 받는다.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = SystemPolicyGridDecimalPostgresIntegrationTest.Config.class)
@EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_TEST_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/sales_decimal_isolated_test")
class SystemPolicyGridDecimalPostgresIntegrationTest {
    private static final long TENANT = 71L;
    private static final long ACTOR = 5L;
    private static final ObjectMapper JSON = new ObjectMapper();

    @Configuration
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
    }

    @Autowired private SystemPolicyDAO dao;

    private static JsonNode typed(int number, int decimal, String decimalRounding, int currency, String currencyRounding,
            String zeros) throws Exception {
        return JSON.readTree("{\"number\":{\"places\":" + number + ",\"trailingZeros\":\"AUTO\",\"rounding\":\"HALF_UP\"},"
                + "\"decimal\":{\"places\":" + decimal + ",\"trailingZeros\":\"AUTO\",\"rounding\":\"" + decimalRounding + "\"},"
                + "\"currency\":{\"places\":" + currency + ",\"trailingZeros\":\"" + zeros + "\",\"rounding\":\""
                + currencyRounding + "\"}}");
    }

    private static SystemPolicySaveRequestVO request(JsonNode value, Integer version) {
        SystemPolicySaveRequestVO request = new SystemPolicySaveRequestVO();
        request.setPolicyCode("GRID_DECIMAL_SALES");
        request.setPolicyName("영업 소수점");
        request.setCategory("영업관리");
        request.setValueType("NUMBER");
        request.setMinValue(BigDecimal.ZERO);
        request.setMaxValue(BigDecimal.valueOf(6));
        request.setValue(value);
        request.setVersion(version);
        return request;
    }

    @Test
    void savesTypedPoliciesRecordsHistoryAndKeepsStateOnFailureThenAcceptsRetry() throws Exception {
        SystemPolicyServiceImpl service = new SystemPolicyServiceImpl(dao);

        // 1) 타입별로 다르게 저장하고 재조회
        SystemPolicyVO created = service.createPolicy(TENANT, ACTOR, request(typed(0, 3, "DOWN", 2, "HALF_UP", "FIXED"), null));
        assertEquals(Integer.valueOf(1), created.getVersion());
        Map<String, Object> stored = service.getGridDecimals(TENANT).get("SALES");
        assertThat(((Map<?, ?>) stored.get("number")).get("places")).isEqualTo(0);
        assertThat(((Map<?, ?>) stored.get("decimal")).get("places")).isEqualTo(3);
        assertThat(((Map<?, ?>) stored.get("decimal")).get("rounding")).isEqualTo("DOWN");
        assertThat(((Map<?, ?>) stored.get("currency")).get("places")).isEqualTo(2);
        assertThat(((Map<?, ?>) stored.get("currency")).get("trailingZeros")).isEqualTo("FIXED");

        // 저장된 정책이 영업 서버 계산에 그대로 반영된다.
        DecimalPolicy sales = DecimalPolicy.forModule("SALES", service.getGridDecimals(TENANT), java.util.Collections.<String, Object>emptyMap());
        assertEquals(new BigDecimal("1.24"), sales.amount(new BigDecimal("1.239"), "금액"));
        assertEquals(new BigDecimal("2"), sales.inputQuantity(new BigDecimal("2.0"), "수량"));

        // 2) 수정: 버전 증가, 이력에 변경 전후 값 기록
        SystemPolicyVO updated = service.updatePolicy(TENANT, ACTOR, created.getPolicyId(),
                request(typed(0, 3, "DOWN", 4, "UP", "AUTO"), created.getVersion()));
        assertEquals(Integer.valueOf(2), updated.getVersion());
        Map<String, Object> reloaded = service.getGridDecimals(TENANT).get("SALES");
        assertThat(((Map<?, ?>) reloaded.get("currency")).get("places")).isEqualTo(4);
        assertThat(((Map<?, ?>) reloaded.get("currency")).get("rounding")).isEqualTo("UP");
        assertEquals(new BigDecimal("1.2301"), DecimalPolicy.forModule("SALES", service.getGridDecimals(TENANT), java.util.Collections.<String, Object>emptyMap())
                .amount(new BigDecimal("1.23001"), "금액"));
        List<SystemPolicyHistoryVO> history = service.listHistory(TENANT, created.getPolicyId());
        assertThat(history).hasSize(2);
        assertEquals("UPDATE", history.get(0).getAction());
        assertEquals(2, history.get(0).getBeforeValue().get("currency").get("places").intValue());
        assertEquals(4, history.get(0).getAfterValue().get("currency").get("places").intValue());
        assertEquals("CREATE", history.get(1).getAction());
        assertEquals("tester", history.get(0).getChangedBy());

        // 3) 실패 케이스: 상태(값·버전·이력)가 바뀌지 않는다.
        JsonNode good = typed(0, 3, "DOWN", 3, "HALF_UP", "FIXED");
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.updatePolicy(TENANT, ACTOR, created.getPolicyId(), request(good, 1))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.updatePolicy(TENANT, ACTOR, created.getPolicyId(),
                        request(typed(0, 7, "DOWN", 3, "HALF_UP", "FIXED"), 2))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.updatePolicy(TENANT, ACTOR, created.getPolicyId(),
                        request(typed(0, 3, "FLOOR", 3, "HALF_UP", "FIXED"), 2))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.updatePolicy(TENANT, ACTOR, created.getPolicyId(),
                        request(JSON.readTree("{\"number\":{\"places\":0},\"decimal\":{\"places\":3}}"), 2))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.updatePolicy(TENANT, ACTOR, created.getPolicyId(),
                        request(JSON.readTree("{\"number\":{\"places\":1.5},\"decimal\":{\"places\":3},\"currency\":{\"places\":2}}"), 2)))
                .getStatus());
        assertThat(((Map<?, ?>) service.getGridDecimals(TENANT).get("SALES").get("currency")).get("places")).isEqualTo(4);
        assertThat(service.listHistory(TENANT, created.getPolicyId())).hasSize(2);

        // 4) 재시도: 최신 버전으로 다시 저장하면 성공하고 이력이 하나 늘어난다.
        SystemPolicyVO retried = service.updatePolicy(TENANT, ACTOR, created.getPolicyId(), request(good, 2));
        assertEquals(Integer.valueOf(3), retried.getVersion());
        assertThat(((Map<?, ?>) service.getGridDecimals(TENANT).get("SALES").get("currency")).get("places")).isEqualTo(3);
        assertThat(service.listHistory(TENANT, created.getPolicyId())).hasSize(3);
    }
}
