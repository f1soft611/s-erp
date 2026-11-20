package egovframework.let.sales.revenue.closing.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class RevenueClosingMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/revenue/closing/EgovRevenueClosing_SQL_postgresql.xml";

    @Test
    void detailsAndSummaryUseExplicitLineClosureAndSameSearchScope() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
            assertThat(input).as("revenue closing mapper resource").isNotNull();
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }

        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 9L);
        params.put("deliveryDtFrom", LocalDate.of(2026, 11, 1));
        params.put("deliveryDtTo", LocalDate.of(2026, 11, 30));
        params.put("keyword", "gear");
        params.put("customerIds", Arrays.asList(21L, 34L));
        BoundSql details = configuration.getMappedStatement("RevenueClosingDAO.selectDetails")
                .getBoundSql(params);
        BoundSql summaries = configuration.getMappedStatement("RevenueClosingDAO.selectCustomerSummaries")
                .getBoundSql(params);

        assertThat(details.getSql())
                .contains("h.tenant_id = ?", "h.use_at = 'Y'", "h.delivery_dt BETWEEN",
                        "h.customer_id IN", "d.revenue_closed_at IS NULL", "CASE")
                .contains("h.sales_delivery_id AS \"salesDeliveryId\"")
                .doesNotContain("tb_sales_statement_hd")
                .contains("order_no", "material_code", "material_name");
        assertThat(summaries.getSql())
                .contains("h.tenant_id = ?", "h.use_at = 'Y'", "h.delivery_dt BETWEEN",
                        "h.customer_id IN", "COUNT(*)",
                        "d.revenue_closed_at IS NULL", "GROUP BY h.customer_id")
                .doesNotContain("tb_sales_statement_hd", "COUNT(DISTINCT h.sales_delivery_id)");
        assertThat(details.getParameterMappings()).hasSizeGreaterThan(5);
        assertThat(summaries.getParameterMappings()).hasSizeGreaterThan(5);
    }
}
