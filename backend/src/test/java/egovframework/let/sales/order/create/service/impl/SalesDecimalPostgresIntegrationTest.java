package egovframework.let.sales.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderDetailVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.domain.repository.SalesOrderDAO;
import egovframework.let.sales.shipment.deliveryplan.service.SalesDeliveryPlanService;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.com.cmm.DecimalColumnContract;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = SalesDecimalPostgresIntegrationTest.Config.class)
@EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_TEST_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/sales_decimal_isolated_test")
class SalesDecimalPostgresIntegrationTest {
    @Configuration
    static class Config {
        @Bean
        DataSource dataSource() throws Exception {
            DriverManagerDataSource source = new DriverManagerDataSource(
                    System.getenv("SALES_DECIMAL_TEST_URL"), "postgres",
                    System.getenv().getOrDefault("SALES_DECIMAL_TEST_PASSWORD", ""));
            JdbcTemplate jdbc = new JdbcTemplate(source);
            if (!"sales_decimal_isolated_test".equals(jdbc.queryForObject("SELECT current_database()", String.class))) {
                throw new IllegalStateException("An isolated test database is required");
            }
            // 격리 DB(이름 검증 통과 후)에서만 이전 실행이 남긴 테스트 테이블을 정리한다.
            for (String table : new String[] { "tb_customer_info", "tb_material_info", "tb_sales_destination",
                    "tb_sales_order_hd", "tb_sales_order_dt", "tb_sales_quotation_hd", "tb_sales_quotation_dt",
                    "tb_sales_delivery_hd", "tb_sales_delivery_dt", "tb_sales_delivery_plan_dt",
                    "tb_sales_statement_hd", "tb_sales_statement_dt" }) {
                jdbc.execute("DROP TABLE IF EXISTS " + table + " CASCADE");
            }
            jdbc.execute("CREATE TABLE tb_customer_info (customer_id bigint, tenant_id bigint)");
            jdbc.execute("CREATE TABLE tb_material_info (material_id bigint, tenant_id bigint, material_code text, material_name text)");
            jdbc.execute("CREATE TABLE tb_sales_destination (sales_destination_id bigint, tenant_id bigint, customer_id bigint)");
            jdbc.execute("CREATE TABLE tb_sales_order_hd (sales_order_id bigserial PRIMARY KEY, total_amt numeric(15,2), tenant_id bigint, order_no text, order_dt date, customer_id bigint, sales_destination_id bigint, billing_customer_id bigint, quot_no text, delivery_dt date, delivery_place text, delivery_method text, status text, remark text, created_by text)");
            jdbc.execute("CREATE TABLE tb_sales_order_dt (sales_order_detail_id bigserial PRIMARY KEY, sales_order_id bigint, tenant_id bigint, line_no int, material_id bigint, order_qty numeric(15,2), unit_price numeric(15,2), supply_amt numeric(15,2), vat_amt numeric(15,2), total_amt numeric(15,2), shipped_qty numeric(15,2), delivery_dt date, line_status text)");
            jdbc.execute("CREATE TABLE tb_sales_quotation_hd (supply_amt numeric(15,2), vat_amt numeric(15,2), total_amt numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_quotation_dt (quotation_qty numeric(15,2), unit_price numeric(15,2), line_amt numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_delivery_hd (total_amt numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_delivery_dt (delivery_qty numeric(15,2), unit_price numeric(15,2), supply_amt numeric(15,2), vat_amt numeric(15,2), total_amt numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_delivery_plan_dt (planned_qty numeric(15,2), delivered_qty numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_statement_hd (total_amt numeric(15,2))");
            jdbc.execute("CREATE TABLE tb_sales_statement_dt (delivery_qty numeric(15,2), unit_price numeric(15,2), supply_amt numeric(15,2), vat_amt numeric(15,2), total_amt numeric(15,2))");
            jdbc.execute(new String(Files.readAllBytes(Paths.get(
                    "DATABASE/20261124/20261124_004_expand_sales_decimals.sql")), StandardCharsets.UTF_8));
            jdbc.update("INSERT INTO tb_customer_info VALUES (10, 71), (11, 71)");
            jdbc.update("INSERT INTO tb_material_info VALUES (20, 71, 'M20', 'test')");
            jdbc.update("INSERT INTO tb_sales_destination VALUES (90, 71, 10)");
            return source;
        }

        @Bean(name = "sqlSession")
        SqlSessionFactory sqlSessionFactory(DataSource source) throws Exception {
            SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
            factory.setDataSource(source);
            factory.setConfigLocation(new ClassPathResource("egovframework/mapper/config/mapper-config.xml"));
            factory.setMapperLocations(new ClassPathResource(
                    "egovframework/mapper/let/sales/order/create/EgovSalesOrderCreate_SQL_postgresql.xml"));
            return factory.getObject();
        }

        @Bean
        SalesOrderDAO dao(SqlSessionFactory factory) {
            SalesOrderDAO dao = new SalesOrderDAO();
            dao.setSqlSessionFactory(factory);
            return dao;
        }
    }

    @Autowired private SalesOrderDAO dao;

    @Test
    @EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_COLUMN_FIXTURE", matches = "true")
    void storesAndReloadsDifferentColumnRulesUsingTheSharedFixture() throws Exception {
        Map<String, Object> contract = DecimalColumnContract.forDocument("sales.order");
        assertThat(((Map<?, ?>) contract.get("supplyAmount")).get("places")).isEqualTo(2);
        assertThat(((Map<?, ?>) contract.get("orderTotal")).get("places")).isEqualTo(1);
        IdSequenceService sequence = mock(IdSequenceService.class);
        SalesDeliveryPlanService plans = mock(SalesDeliveryPlanService.class);
        SystemPolicyService policies = mock(SystemPolicyService.class);
        when(sequence.nextValue("SALES_ORDER_NO", "71", "20261124")).thenReturn(1L);
        when(plans.lockModeForPlanCreation(71L)).thenReturn("MANUAL");
        Map<String, Object> rule = new HashMap<>();
        rule.put("places", 3);
        rule.put("rounding", "DOWN");
        when(policies.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", rule));

        String json = "{\"orderDt\":\"2026-11-24\",\"customerId\":10,\"salesDestinationId\":90,"
                + "\"billingCustomerId\":11,\"details\":[{\"materialId\":20,\"orderQty\":\"1\","
                + "\"unitPrice\":\"1.235\",\"vatAmt\":\"0.1\"}]}";
        SalesOrderCreateRequestVO payload = new ObjectMapper().findAndRegisterModules()
                .readValue(json, SalesOrderCreateRequestVO.class);
        payload.setDecimalColumns(contract);
        SalesOrderVO saved = new SalesOrderServiceImpl(dao, sequence, plans, policies)
                .createOrder(71L, "test", payload);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("salesOrderId", saved.getSalesOrderId());
        List<SalesOrderDetailVO> details = dao.selectOrderDetails(params);
        assertThat(details).hasSize(1);
        assertThat(details.get(0).getOrderQty()).isEqualByComparingTo("1");
        assertThat(details.get(0).getUnitPrice()).isEqualByComparingTo("1.235");
        assertThat(details.get(0).getSupplyAmt()).isEqualByComparingTo("1.24");
        assertThat(details.get(0).getVatAmt()).isEqualByComparingTo("0.1");
        assertThat(details.get(0).getTotalAmt()).isEqualByComparingTo("1.340");
        assertThat(saved.getTotalAmt()).isEqualByComparingTo("1.3");
    }

    @Test
    void preservesExactRequestValuesThroughServiceMapperAndPostgres() throws Exception {
        IdSequenceService sequence = mock(IdSequenceService.class);
        SalesDeliveryPlanService plans = mock(SalesDeliveryPlanService.class);
        SystemPolicyService policies = mock(SystemPolicyService.class);
        when(sequence.nextValue("SALES_ORDER_NO", "71", "20261124")).thenReturn(1L);
        when(plans.lockModeForPlanCreation(71L)).thenReturn("MANUAL");
        Map<String, Object> rule = new HashMap<>();
        rule.put("places", 6);
        rule.put("rounding", "DOWN");
        when(policies.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", rule));

        String json = "{\"orderDt\":\"2026-11-24\",\"customerId\":10,\"salesDestinationId\":90,"
                + "\"billingCustomerId\":11,\"details\":[{\"materialId\":20,\"orderQty\":\"1\","
                + "\"unitPrice\":\"1234567890123.100001\",\"vatAmt\":\"0.000001\"}]}";
        SalesOrderCreateRequestVO payload = new ObjectMapper().findAndRegisterModules()
                .readValue(json, SalesOrderCreateRequestVO.class);
        SalesOrderVO saved = new SalesOrderServiceImpl(dao, sequence, plans, policies)
                .createOrder(71L, "test", payload);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("salesOrderId", saved.getSalesOrderId());
        List<SalesOrderDetailVO> details = dao.selectOrderDetails(params);
        assertThat(details).hasSize(1);
        assertThat(details.get(0).getUnitPrice()).isEqualByComparingTo("1234567890123.100001");
        assertThat(details.get(0).getSupplyAmt()).isEqualByComparingTo("1234567890123.100001");
        assertThat(details.get(0).getVatAmt()).isEqualByComparingTo("0.000001");
        assertThat(details.get(0).getTotalAmt()).isEqualByComparingTo("1234567890123.100002");
    }

    @Test
    void storesRoundedCalculatedAmountsUsingTypedPolicies() throws Exception {
        String[][] cases = {
                {"0", "DOWN", "1.5", "1", "1"},
                {"0", "UP", "1.5", "1", "2"},
                {"0", "HALF_UP", "1.5", "1", "2"},
                {"3", "DOWN", "1.5", "1.001", "1.501"},
                {"3", "UP", "1.5", "1.001", "1.502"},
                {"3", "HALF_UP", "1.5", "1.001", "1.502"},
                {"6", "DOWN", "1.5", "1.000001", "1.500001"},
                {"6", "UP", "1.5", "1.000001", "1.500002"},
                {"6", "HALF_UP", "1.5", "1.000001", "1.500002"},
        };
        for (String[] scenario : cases) {
            IdSequenceService sequence = mock(IdSequenceService.class);
            SalesDeliveryPlanService plans = mock(SalesDeliveryPlanService.class);
            SystemPolicyService policies = mock(SystemPolicyService.class);
            when(sequence.nextValue("SALES_ORDER_NO", "71", "20261124")).thenReturn(1L);
            when(plans.lockModeForPlanCreation(71L)).thenReturn("MANUAL");
            Map<String, Object> quantity = new HashMap<>();
            quantity.put("places", 3);
            quantity.put("rounding", "HALF_UP");
            Map<String, Object> amount = new HashMap<>();
            amount.put("places", Integer.valueOf(scenario[0]));
            amount.put("rounding", scenario[1]);
            Map<String, Object> price = new HashMap<>();
            price.put("places", 6);
            price.put("rounding", "DOWN");
            Map<String, Object> typed = new HashMap<>();
            typed.put("number", quantity);
            typed.put("decimal", price);
            typed.put("currency", amount);
            when(policies.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", typed));
            String json = "{\"orderDt\":\"2026-11-24\",\"customerId\":10,\"salesDestinationId\":90,"
                    + "\"billingCustomerId\":11,\"details\":[{\"materialId\":20,\"orderQty\":\""
                    + scenario[2] + "\",\"unitPrice\":\"" + scenario[3] + "\",\"vatAmt\":\"0\"}]}";
            SalesOrderCreateRequestVO payload = new ObjectMapper().findAndRegisterModules()
                    .readValue(json, SalesOrderCreateRequestVO.class);
            SalesOrderVO saved = new SalesOrderServiceImpl(dao, sequence, plans, policies)
                    .createOrder(71L, "test", payload);
            Map<String, Object> params = new HashMap<>();
            params.put("tenantId", 71L);
            params.put("salesOrderId", saved.getSalesOrderId());
            List<SalesOrderDetailVO> details = dao.selectOrderDetails(params);
            assertThat(details).hasSize(1);
            assertThat(details.get(0).getOrderQty()).isEqualByComparingTo(scenario[2]);
            assertThat(details.get(0).getUnitPrice()).isEqualByComparingTo(scenario[3]);
            assertThat(details.get(0).getSupplyAmt()).isEqualByComparingTo(scenario[4]);
            assertThat(details.get(0).getTotalAmt()).isEqualByComparingTo(scenario[4]);
        }
    }
}
