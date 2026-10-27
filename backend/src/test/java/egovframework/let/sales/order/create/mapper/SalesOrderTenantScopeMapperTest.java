package egovframework.let.sales.order.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesOrderTenantScopeMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/order/create/EgovSalesOrderCreate_SQL_postgresql.xml";

    @Test
    void masterValidationStatementsRequireBothRecordIdAndAuthenticatedTenant() throws Exception {
        Configuration configuration = parse();

        for (String id : Arrays.asList("existsCustomer", "existsMaterial")) {
            BoundSql sql = sql(configuration, id);
            assertThat(sql.getSql()).contains("tenant_id = ?", " = ?");
            assertThat(properties(sql)).contains("tenantId", "id");
        }
    }

    @Test
    void insertsOnlyApprovedColumnsAndBindTenantAndCalculatedValues() throws Exception {
        Configuration configuration = parse();
        BoundSql header = sql(configuration, "insertOrderHeader");
        assertThat(header.getSql()).contains(
                "tenant_id", "order_no", "order_dt", "customer_id",
                "status", "total_amt", "created_by", "RETURNING sales_order_id");
        assertThat(properties(header)).contains(
                "tenantId", "orderNo", "orderDt", "customerId",
                "status", "totalAmt", "createdBy");

        BoundSql detail = sql(configuration, "insertOrderDetail");
        assertThat(detail.getSql()).contains(
                "sales_order_id", "tenant_id", "line_no", "material_id",
                "order_qty", "unit_price", "supply_amt", "vat_amt",
                "total_amt", "shipped_qty", "line_status",
                "RETURNING sales_order_detail_id");
        assertThat(properties(detail)).contains(
                "salesOrderId", "tenantId", "lineNo", "materialId",
                "orderQty", "unitPrice", "supplyAmt", "vatAmt",
                "totalAmt", "shippedQty", "lineStatus");
    }

    @Test
    void dateColumnsCastStringParametersToPostgresDate() throws Exception {
        Configuration configuration = parse();

        String header = normalize(sql(configuration, "insertOrderHeader").getSql());
        assertThat(header).contains("?, ?, CAST(? AS date), ?, ?, CAST(? AS date)");

        String detail = normalize(sql(configuration, "insertOrderDetail").getSql());
        assertThat(detail).contains("CAST(? AS date)");
    }

    @Test
    void readAndChangeStatementsAreScopedByTenantAndActiveHeader() throws Exception {
        Configuration configuration = parse();

        for (String id : Arrays.asList(
                "selectOrder", "selectOrderDetails", "countShippedDetails",
                "updateOrderHeader", "deleteOrderDetails", "softDeleteOrderHeader")) {
            BoundSql sql = sql(configuration, id);
            assertThat(normalize(sql.getSql())).as(id).contains("tenant_id = ?");
            assertThat(properties(sql)).as(id).contains("tenantId", "salesOrderId");
        }
        for (String id : Arrays.asList("selectOrder", "updateOrderHeader", "softDeleteOrderHeader")) {
            assertThat(normalize(sql(configuration, id).getSql())).as(id).contains("use_at = 'Y'");
        }
    }

    @Test
    void loadJoinsMasterCodesAndOrdersDetailsByLine() throws Exception {
        Configuration configuration = parse();

        String header = normalize(sql(configuration, "selectOrder").getSql());
        assertThat(header).contains("tb_customer_info", "customer_code", "customer_name");

        String details = normalize(sql(configuration, "selectOrderDetails").getSql());
        assertThat(details).contains("tb_material_info", "material_code", "material_name",
                "ORDER BY d.line_no");
    }

    @Test
    void updateKeepsOrderNumberAndCastsDatesWhileSoftDeleteMarksHeaderUnused() throws Exception {
        Configuration configuration = parse();

        String update = normalize(sql(configuration, "updateOrderHeader").getSql());
        assertThat(update).contains("order_dt = CAST(? AS date)", "delivery_dt = CAST(? AS date)",
                "updated_by = ?", "updated_at = now()");
        assertThat(update).doesNotContain("order_no");

        String delete = normalize(sql(configuration, "softDeleteOrderHeader").getSql());
        assertThat(delete).contains("use_at = 'N'", "updated_by = ?");
    }

    private String normalize(String sql) {
        return sql.replaceAll("\\s+", " ");
    }

    private Configuration parse() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private BoundSql sql(Configuration configuration, String id) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("id", 1L);
        params.put("orderNo", "SO-20261027-0001");
        params.put("orderDt", "2026-10-27");
        params.put("customerId", 10L);
        params.put("status", "수주등록");
        params.put("totalAmt", 11.17);
        params.put("createdBy", "user01");
        params.put("salesOrderId", 300L);
        params.put("lineNo", 1);
        params.put("materialId", 20L);
        params.put("orderQty", 2);
        params.put("unitPrice", 2);
        params.put("supplyAmt", 4);
        params.put("vatAmt", 1);
        params.put("shippedQty", 0);
        params.put("lineStatus", "대기");
        params.put("updatedBy", "user02");
        return configuration.getMappedStatement("SalesOrderDAO." + id).getBoundSql(params);
    }

    private List<String> properties(BoundSql sql) {
        return sql.getParameterMappings().stream()
                .map(item -> item.getProperty())
                .collect(Collectors.toList());
    }
}
