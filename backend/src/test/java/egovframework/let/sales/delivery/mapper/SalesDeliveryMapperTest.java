package egovframework.let.sales.delivery.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesDeliveryMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/delivery/EgovSalesDelivery_SQL_postgresql.xml";

    @Test
    void parsesAllDeliveryStatementsAndReturnsExpectedQueryAliases() throws Exception {
        Configuration configuration = parse();
        for (String id : Arrays.asList(
                "existsActiveCustomer", "existsActiveMaterial", "lockSourceOrder",
                "selectSourceOrderDetail", "selectSourceOrders", "insertDeliveryHeader",
                "insertDeliveryDetail", "selectDelivery", "lockDeliveryHeader",
                "selectDeliveryDetails", "adjustShippedQty", "updateDeliveryHeader",
                "deleteDeliveryDetails", "softDeleteDeliveryHeader", "selectDeliveryStatus")) {
            assertThat(configuration.hasStatement("SalesDeliveryDAO." + id)).as(id).isTrue();
        }

        String sourceOrders = normalize(sql(configuration, "selectSourceOrders").getSql());
        assertThat(sourceOrders).contains(
                "sales_order_id AS salesOrderId",
                "sales_order_detail_id AS salesOrderDetailId",
                "customer_id AS customerId",
                "material_id AS materialId",
                "remainingQty",
                "h.use_at = 'Y'",
                "LIMIT ?");
        String status = normalize(sql(configuration, "selectDeliveryStatus").getSql());
        assertThat(status).contains(
                "delivery_dt BETWEEN CAST(? AS date) AND CAST(? AS date)",
                "sales_delivery_detail_id AS salesDeliveryDetailId",
                "COALESCE(h.created_by = ?, FALSE) AS writer",
                "ORDER BY h.delivery_dt DESC");
        assertThat(normalize(sql(configuration, "existsActiveCustomer").getSql()))
                .contains("use_at = 'Y'");
        assertThat(normalize(sql(configuration, "existsActiveMaterial").getSql()))
                .contains("delete_status = 'N'", "deleted_at IS NULL");
    }

    @Test
    void bindsSourceReferencesWithExplicitBigintAndNumbersWithNumeric() throws Exception {
        Configuration configuration = parse();
        BoundSql header = sql(configuration, "insertDeliveryHeader");
        assertJdbcType(header, "salesOrderId", JdbcType.BIGINT);
        assertJdbcType(header, "totalAmt", JdbcType.NUMERIC);

        BoundSql detail = sql(configuration, "insertDeliveryDetail");
        assertJdbcType(detail, "deliveryType", JdbcType.VARCHAR);
        assertJdbcType(detail, "salesOrderId", JdbcType.BIGINT);
        assertJdbcType(detail, "salesOrderDetailId", JdbcType.BIGINT);
        assertJdbcType(detail, "deliveryQty", JdbcType.NUMERIC);
        assertJdbcType(detail, "unitPrice", JdbcType.NUMERIC);
        assertJdbcType(detail, "supplyAmt", JdbcType.NUMERIC);
        assertJdbcType(detail, "vatAmt", JdbcType.NUMERIC);
        assertJdbcType(detail, "totalAmt", JdbcType.NUMERIC);
    }

    @Test
    void locksBothOrderAndDeliveryHeadersAndRetainsDeletedDeliveryReferences() throws Exception {
        Configuration configuration = parse();
        String orderLock = normalize(sql(configuration, "lockSourceOrder").getSql());
        assertThat(orderLock).contains("FOR UPDATE OF h", "h.tenant_id = ?", "h.use_at = 'Y'");

        String deliveryLock = normalize(sql(configuration, "lockDeliveryHeader").getSql());
        assertThat(deliveryLock).contains("FOR UPDATE OF h", "h.tenant_id = ?", "h.use_at = 'Y'");
        String delete = normalize(sql(configuration, "softDeleteDeliveryHeader").getSql());
        assertThat(delete).contains("use_at = 'N'");
        String adjustment = normalize(sql(configuration, "adjustShippedQty").getSql());
        assertThat(adjustment).contains("COALESCE(shipped_qty, 0) + ? >= 0");
    }

    private Configuration parse() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private BoundSql sql(Configuration configuration, String id) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 71L);
        params.put("id", 1L);
        params.put("salesOrderId", 300L);
        params.put("salesOrderDetailId", 400L);
        params.put("salesDeliveryId", 500L);
        params.put("deliveryNo", "SD-20261104-0001");
        params.put("deliveryDt", "2026-11-04");
        params.put("deliveryDtFrom", "2026-11-01");
        params.put("deliveryDtTo", "2026-11-30");
        params.put("deliveryType", "ORDER");
        params.put("customerId", 10L);
        params.put("materialId", 20L);
        params.put("lineNo", 1);
        params.put("deliveryQty", new java.math.BigDecimal("1.00"));
        params.put("unitPrice", new java.math.BigDecimal("2.00"));
        params.put("supplyAmt", new java.math.BigDecimal("2.00"));
        params.put("vatAmt", new java.math.BigDecimal("0.20"));
        params.put("totalAmt", new java.math.BigDecimal("2.20"));
        params.put("deltaQty", new java.math.BigDecimal("1.00"));
        params.put("keyword", "SO");
        params.put("limit", 200);
        params.put("updatedBy", "user01");
        params.put("createdBy", "user01");
        params.put("userId", "user01");
        return configuration.getMappedStatement("SalesDeliveryDAO." + id).getBoundSql(params);
    }

    private void assertJdbcType(BoundSql sql, String property, JdbcType jdbcType) {
        ParameterMapping mapping = sql.getParameterMappings().stream()
                .filter(item -> property.equals(item.getProperty()))
                .findFirst().get();
        assertThat(mapping.getJdbcType()).as(property).isEqualTo(jdbcType);
    }

    private String normalize(String sql) {
        return sql.replaceAll("\\s+", " ");
    }
}
