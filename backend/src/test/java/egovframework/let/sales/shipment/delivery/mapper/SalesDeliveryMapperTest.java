package egovframework.let.sales.shipment.delivery.mapper;

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
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

class SalesDeliveryMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/shipment/delivery/EgovSalesDelivery_SQL_postgresql.xml";

    @Test
    void runtimeResourcePatternLoadsAllShipmentMappersWithoutLegacyDuplicates() throws Exception {
        Configuration configuration = new Configuration();
        int count = 0;
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath*:/egovframework/mapper/**/*_postgresql.xml");
        for (Resource resource : resources) {
            if (!Arrays.asList("EgovSalesDelivery_SQL_postgresql.xml",
                    "EgovSalesDeliveryPlan_SQL_postgresql.xml",
                    "EgovSalesStatement_SQL_postgresql.xml").contains(resource.getFilename())) {
                continue;
            }
            String location = resource.getURL().toExternalForm();
            assertThat(location).contains("/sales/shipment/");
            try (InputStream input = resource.getInputStream()) {
                new XMLMapperBuilder(input, configuration, location, configuration.getSqlFragments()).parse();
            }
            count++;
        }
        assertThat(count).isEqualTo(3);
        assertThat(configuration.hasStatement("SalesDeliveryDAO.selectDelivery")).isTrue();
        assertThat(configuration.hasStatement("SalesDeliveryPlanDAO.selectPlanHeader")).isTrue();
        assertThat(configuration.hasStatement("SalesStatementDAO.selectHeader")).isTrue();
    }

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
                "d.sales_order_id AS salesOrderId",
                "o.sales_order_id = d.sales_order_id",
                "COALESCE(h.created_by = ?, FALSE) AS writer",
                "ORDER BY h.delivery_dt DESC");
        String delivery = normalize(sql(configuration, "selectDelivery").getSql());
        assertThat(delivery).contains("string_agg(DISTINCT source_order.order_no",
                "source_detail.sales_delivery_id = h.sales_delivery_id",
                "u.user_nm AS createdByName",
                "la.profile_image AS createdByProfileImage",
                "to_char(h.created_at, 'YYYY-MM-DD HH24:MI') AS createdAt",
                "la.login_code = h.created_by",
                "la.tenant_id = h.tenant_id",
                "u.login_id = la.login_id",
                "u.tenant_id = la.tenant_id");
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
    void deliveryDetailProvidesMaterialSpecificationForStatementPreview() throws Exception {
        assertThat(normalize(sql(parse(), "selectDeliveryDetails").getSql()))
                .contains("m.material_spec AS materialSpec");
    }

    @Test
    void planSourceQueriesUseDetailOwnershipAndOnlyPositiveDeliveryBalances() throws Exception {
        Configuration configuration = parse();
        String sourceRows = normalize(sql(configuration, "selectSourceOrders").getSql());
        assertThat(sourceRows).contains(
                "ph.sales_delivery_plan_id = pd.sales_delivery_plan_id",
                "h.sales_order_id = pd.sales_order_id",
                "d.sales_order_detail_id = pd.sales_order_detail_id",
                "pd.planned_qty > pd.delivered_qty")
                .doesNotContain("ph.sales_order_id", "OR EXISTS (");

        String sourceDetail = normalize(sql(configuration, "selectSourcePlanDetail").getSql());
        assertThat(sourceDetail).contains(
                "ph.sales_delivery_plan_id = pd.sales_delivery_plan_id",
                "pd.sales_order_id = ?", "od.sales_order_detail_id = pd.sales_order_detail_id")
                .doesNotContain("ph.sales_order_id");
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

    @Test
    void sourceSearchRequiresPositiveBalanceWhileCounterUpdatesRetainWarnPolicy() throws Exception {
        Configuration configuration = parse();
        assertThat(normalize(sql(configuration, "selectSourceOrders").getSql()))
                .contains("pd.planned_qty > pd.delivered_qty", "pd.planned_qty - pd.delivered_qty AS remainingQty")
                .doesNotContain("over_delivery_policy = 'WARN'", "OR EXISTS (");
        for (String id : Arrays.asList("adjustShippedQty", "adjustPlanDeliveredQty")) {
            assertThat(normalize(sql(configuration, id).getSql()))
                    .contains("over_delivery_policy = 'WARN'", ">= 0", "? <= 0");
        }
    }

    @Test
    void sourceOrderSearchFiltersAreAppliedBeforeLimit() throws Exception {
        Configuration configuration = parse();
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 71L);
        params.put("limit", 200);
        params.put("keyword", "SO");
        params.put("orderDtFrom", "2026-11-01");
        params.put("orderDtTo", "2026-11-30");
        params.put("orderNo", "SO-7");
        params.put("customerKeyword", "C10");
        params.put("materialKeyword", "M20");
        params.put("planNo", "DP-2");
        params.put("planDtFrom", "2026-11-05");
        params.put("planDtTo", "2026-11-20");
        BoundSql bound = configuration.getMappedStatement("SalesDeliveryDAO.selectSourceOrders").getBoundSql(params);
        String query = normalize(bound.getSql());

        assertThat(query).contains(
                "h.tenant_id = ?",
                "h.order_dt BETWEEN CAST(? AS date) AND CAST(? AS date)",
                "h.order_no ILIKE '%' || ? || '%'",
                "c.customer_code ILIKE '%' || ? || '%' OR c.customer_name ILIKE '%' || ? || '%'",
                "m.material_code ILIKE '%' || ? || '%' OR m.material_name ILIKE '%' || ? || '%'",
                "ph.plan_no ILIKE '%' || ? || '%'",
                "pd.plan_dt >= CAST(? AS date)",
                "pd.plan_dt <= CAST(? AS date)",
                "pd.planned_qty > pd.delivered_qty",
                "LIMIT ?");
        assertThat(bound.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("keyword", "orderDtFrom", "orderDtTo", "orderNo", "customerKeyword",
                        "materialKeyword", "planNo", "planDtFrom", "planDtTo", "limit");
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
