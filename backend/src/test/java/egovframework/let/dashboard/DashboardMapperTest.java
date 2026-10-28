package egovframework.let.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class DashboardMapperTest {
    private static final String RESOURCE = "egovframework/mapper/let/dashboard/Dashboard_SQL_postgresql.xml";

    @Test
    void aggregatesDetailsBeforeCountingOrderHeaders() throws Exception {
        String sql = sql("selectSalesTotals");
        assertThat(sql).contains("GROUP BY d.tenant_id, d.sales_order_id",
                "d.tenant_id = ?", "h.tenant_id = ?", "h.use_at = 'Y'",
                "COUNT(*)", "COALESCE(SUM(detail.supply_amount), 0)",
                "h.order_dt >= CAST(? AS date)", "h.order_dt <= CAST(? AS date)");
    }

    @Test
    void limitsUpcomingToDistinctOrdersAndUsesDetailDeliveryFirst() throws Exception {
        assertThat(sql("selectUpcomingOrders")).contains(
                "COALESCE(d.delivery_dt, h.delivery_dt)", "d.tenant_id = h.tenant_id",
                "c.tenant_id = due.tenant_id", "h.tenant_id = ?", "h.use_at = 'Y'",
                "GROUP BY h.sales_order_id", "LIMIT 5");
        assertThat(sql("selectUpcomingCount")).contains("COUNT(DISTINCT h.sales_order_id)");
    }

    @Test
    void restrictsPersonalRevisionAndNoticeQueries() throws Exception {
        assertThat(sql("selectMyRevisionCount")).contains("tenant_id = ?", "drafter_id = ?",
                "document_status = 'REVISION_REQUESTED'", "deleted_yn = 'N'");
        assertThat(sql("selectNotices")).contains("tenant_id = ?", "board_type_code = 'NOTICE'",
                "is_deleted = 'N'", "ORDER BY is_pinned DESC, created_at DESC, post_id DESC", "LIMIT 5")
                .doesNotContain("contents", "writer_id");
        assertThat(sql("selectSalesTrend")).contains("GROUP BY d.tenant_id, d.sales_order_id",
                "h.tenant_id = ?", "GROUP BY TO_CHAR(h.order_dt, 'YYYY-MM')");
    }

    private String sql(String id) throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
            assertThat(input).as("dashboard mapper resource exists").isNotNull();
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("drafterId", "fixture");
        params.put("from", "2026-10-01");
        params.put("to", "2026-10-31");
        params.put("trendFrom", "2026-05-01");
        params.put("dueFrom", "2026-10-28");
        params.put("dueTo", "2026-11-03");
        BoundSql bound = configuration.getMappedStatement("DashboardDAO." + id).getBoundSql(params);
        return bound.getSql().replaceAll("\\s+", " ").trim();
    }
}
