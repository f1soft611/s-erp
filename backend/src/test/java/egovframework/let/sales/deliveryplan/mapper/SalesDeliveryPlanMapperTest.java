package egovframework.let.sales.deliveryplan.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesDeliveryPlanMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/deliveryplan/EgovSalesDeliveryPlan_SQL_postgresql.xml";

    @Test
    void parsesPlanStatementsAndEnforcesTenantAndOrderScopes() throws Exception {
        Configuration configuration = parse();
        for (String id : Arrays.asList(
                "selectTenantMode", "lockTenantModeForPlanCreation", "lockSourceOrder", "selectPlanByOrder", "selectPlanHeader",
                "lockPlanHeader", "selectPlanDetails", "selectOrderLines", "selectPlanSourceOrders", "sumOtherPlannedQty",
                "insertPlanHeader", "insertPlanDetail", "updatePlanDetail", "deletePlanDetail",
                "countDeliveryReferences", "selectPlanStatus")) {
            assertThat(configuration.hasStatement("SalesDeliveryPlanDAO." + id)).as(id).isTrue();
        }
        String modeLock = normalize(sql(configuration, "lockTenantModeForPlanCreation").getSql());
        assertThat(modeLock).contains("SELECT delivery_plan_mode", "FROM tb_tenant", "tenant_id = ?", "FOR SHARE")
                .doesNotContain("FOR UPDATE");
        String header = normalize(sql(configuration, "selectPlanHeader").getSql());
        assertThat(header).contains("ph.tenant_id = ?", "ph.use_at = 'Y'")
                .doesNotContain("ph.sales_order_id", "oh.order_no", "customer_name");
        String byOrder = normalize(sql(configuration, "selectPlanByOrder").getSql());
        assertThat(byOrder).contains("pd.sales_order_id = ?", "pd.tenant_id = ?", "ph.use_at = 'Y'")
                .doesNotContain("ph.sales_order_id");
        String orderLock = normalize(sql(configuration, "lockSourceOrder").getSql());
        assertThat(orderLock).contains("FOR UPDATE OF h", "h.tenant_id = ?");
        String planLock = normalize(sql(configuration, "lockPlanHeader").getSql());
        assertThat(planLock).contains("FOR UPDATE OF ph", "ph.tenant_id = ?");
        String remaining = normalize(sql(configuration, "selectPlanSourceOrders").getSql());
        assertThat(remaining).contains("COALESCE(od.delivery_dt, h.delivery_dt) AS planDt",
                "h.status = '수주등록'", "AS remainingPlanQty", "SUM(pd.planned_qty)");
        String otherTotals = normalize(sql(configuration, "sumOtherPlannedQty").getSql());
        assertThat(otherTotals).contains("pd.sales_order_id = ?", "pd.sales_order_detail_id = ?",
                "ph.use_at = 'Y'", "pd.sales_delivery_plan_id <> ?");
        String details = normalize(sql(configuration, "selectPlanDetails").getSql());
        assertThat(details).contains("oh.order_no AS orderNo", "to_char(oh.order_dt, 'YYYY-MM-DD') AS orderDt",
                "c.customer_code AS customerCode", "c.customer_name AS customerName");
        String insertHeader = normalize(sql(configuration, "insertPlanHeader").getSql());
        assertThat(insertHeader).contains("plan_no", "created_by").doesNotContain("sales_order_id");
    }

    @Test
    void loadsPlanWriterProfileOnlyInTenantScopedDetailQuery() throws Exception {
        Configuration configuration = parse();
        String header = normalize(sql(configuration, "selectPlanHeader").getSql());
        assertThat(header).contains("la.profile_image AS createdByProfileImage", "u.user_nm AS createdByName",
                "la.login_code = ph.created_by", "la.tenant_id = ph.tenant_id",
                "u.login_id = la.login_id", "u.tenant_id = la.tenant_id");
        assertThat(normalize(sql(configuration, "selectPlanStatus").getSql())).doesNotContain("profile_image");
        assertThat(normalize(sql(configuration, "lockPlanHeader").getSql())).doesNotContain("profile_image");
    }

    @Test
    void limitsPlanMutationsToTheCurrentTenantAndReferencedDocument() throws Exception {
        Configuration configuration = parse();
        String insertDetail = normalize(sql(configuration, "insertPlanDetail").getSql());
        assertThat(insertDetail).contains("sales_delivery_plan_id", "sales_order_detail_id",
                "planned_qty", "RETURNING sales_delivery_plan_detail_id");
        String update = normalize(sql(configuration, "updatePlanDetail").getSql());
        assertThat(update).contains("sales_delivery_plan_detail_id = ?",
                "sales_delivery_plan_id = ?", "tenant_id = ?");
        String deliveryCount = normalize(sql(configuration, "countDeliveryReferences").getSql());
        assertThat(deliveryCount).contains("sales_delivery_plan_detail_id = ?", "tenant_id = ?")
                .doesNotContain("dh.use_at");
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
        params.put("salesOrderId", 300L);
        params.put("salesOrderDetailId", 400L);
        params.put("salesDeliveryPlanId", 500L);
        params.put("salesDeliveryPlanDetailId", 600L);
        params.put("planNo", "DP-20261105-0001");
        params.put("lineNo", 1);
        params.put("planDtFrom", "2026-11-01");
        params.put("planDtTo", "2026-11-30");
        params.put("plannedQty", new java.math.BigDecimal("10.00"));
        params.put("currentPlanId", 500L);
        params.put("deliveredQty", new java.math.BigDecimal("0.00"));
        params.put("keyword", "SO");
        params.put("limit", 200);
        params.put("createdBy", "user01");
        params.put("updatedBy", "user01");
        return configuration.getMappedStatement("SalesDeliveryPlanDAO." + id).getBoundSql(params);
    }

    private String normalize(String sql) {
        return sql.replaceAll("\\s+", " ");
    }
}
