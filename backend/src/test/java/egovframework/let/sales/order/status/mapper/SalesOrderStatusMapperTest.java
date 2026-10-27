package egovframework.let.sales.order.status.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesOrderStatusMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/order/status/EgovSalesOrderStatus_SQL_postgresql.xml";

    @Test
    void joinsHeaderDetailAndMastersWithinTenantAndActiveOrders() throws Exception {
        String sql = normalize(sql(new HashMap<>()).getSql());

        assertThat(sql).contains(
                "FROM tb_sales_order_hd h",
                "JOIN tb_sales_order_dt d",
                "d.sales_order_id = h.sales_order_id",
                "d.tenant_id = h.tenant_id",
                "tb_customer_info", "tb_material_info",
                "h.tenant_id = ?", "h.use_at = 'Y'",
                "ORDER BY h.order_dt DESC, h.order_no DESC, d.line_no");
        assertThat(sql).doesNotContain("h.order_dt >=", "ILIKE");
    }

    @Test
    void appliesOptionalFiltersWithDateCastsAndCaseInsensitiveKeywords() throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("keyword", "so");
        params.put("orderNo", "SO-1");
        params.put("orderDtFrom", "2026-10-01");
        params.put("orderDtTo", "2026-10-31");
        params.put("customerKeyword", "거래처");
        params.put("quotNo", "Q-1");
        params.put("status", "수주등록");
        params.put("deliveryDtFrom", "2026-11-01");
        params.put("deliveryDtTo", "2026-11-30");
        params.put("materialKeyword", "볼트");
        params.put("lineStatus", "대기");

        BoundSql bound = sql(params);
        String sql = normalize(bound.getSql());

        assertThat(sql).contains(
                "h.order_dt >= CAST(? AS date)", "h.order_dt <= CAST(? AS date)",
                "COALESCE(d.delivery_dt, h.delivery_dt) >= CAST(? AS date)",
                "COALESCE(d.delivery_dt, h.delivery_dt) <= CAST(? AS date)",
                "h.status = ?", "d.line_status = ?", "ILIKE");
        assertThat(properties(bound)).contains(
                "tenantId", "orderNo", "orderDtFrom", "orderDtTo", "customerKeyword",
                "quotNo", "status", "deliveryDtFrom", "deliveryDtTo",
                "materialKeyword", "lineStatus");
        assertThat(properties(bound).stream().filter("keyword"::equals).count())
                .isGreaterThanOrEqualTo(4);
    }

    private BoundSql sql(Map<String, Object> filters) throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<>(filters);
        params.put("tenantId", 71L);
        return configuration.getMappedStatement("SalesOrderStatusDAO.selectOrderStatusList")
                .getBoundSql(params);
    }

    private String normalize(String sql) {
        return sql.replaceAll("\\s+", " ");
    }

    private List<String> properties(BoundSql sql) {
        return sql.getParameterMappings().stream()
                .map(item -> item.getProperty())
                .collect(Collectors.toList());
    }
}
