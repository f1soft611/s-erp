package egovframework.let.sales.shipment.statement.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesStatementMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/shipment/statement/EgovSalesStatement_SQL_postgresql.xml";

    @Test
    void statementMapperScopesGroupedLineSnapshotsAndExcludesIssuedTargets() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
            assertThat(input).as("statement mapper resource").isNotNull();
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 71L);
        params.put("salesDeliveryId", 15L);
        params.put("salesStatementId", 100L);
        params.put("salesDeliveryDetailIds", Arrays.asList(21L, 22L));
        params.put("keyword", "");
        for (String id : new String[] { "selectHeader", "selectDetails", "selectStatus",
                "selectSources", "selectAvailableDetailIdsByDelivery", "lockDelivery",
                "lockDeliveryDetails", "existsActiveLine", "insertHeader", "insertDetails",
                "updateHeader", "clearSourceDetailLinks", "deleteHeader" }) {
            BoundSql sql = configuration.getMappedStatement("SalesStatementDAO." + id)
                    .getBoundSql(params);
            assertThat(sql.getSql()).as(id).containsIgnoringCase("tenant_id");
        }
        String header = configuration.getMappedStatement("SalesStatementDAO.insertHeader")
                .getBoundSql(params).getSql();
        assertThat(header).contains("t.president_name", "t.address", "c.business_no",
                "supplier_stamp_image", "t.stamp_image", "SUM(d.total_amt)");
        String detail = configuration.getMappedStatement("SalesStatementDAO.insertDetails")
                .getBoundSql(params).getSql();
        assertThat(detail).contains("sales_delivery_detail_id", "d.delivery_qty", "d.unit_price",
                "d.supply_amt", "d.vat_amt", "d.total_amt", "m.material_spec");
        String lockLines = configuration.getMappedStatement("SalesStatementDAO.lockDeliveryDetails")
                .getBoundSql(params).getSql();
        assertThat(lockLines).contains("d.sales_delivery_detail_id", "h.tenant_id = ?", "FOR UPDATE OF h, d");
        String activeLine = configuration.getMappedStatement("SalesStatementDAO.existsActiveLine")
                .getBoundSql(params).getSql();
        assertThat(activeLine).contains("sales_delivery_detail_id = ?", "use_at = 'Y'");
        String sources = configuration.getMappedStatement("SalesStatementDAO.selectSources")
                .getBoundSql(params).getSql();
        assertThat(sources).contains("salesDeliveryDetailIds", "revenue_closed_at IS NULL",
                "NOT EXISTS", "tb_sales_statement_dt", "tb_sales_statement_hd");
        String read = configuration.getMappedStatement("SalesStatementDAO.selectHeader")
                .getBoundSql(params).getSql();
        assertThat(read).contains("h.supplier_name", "h.customer_name", "COALESCE(h.supplier_stamp_image, t.stamp_image)",
                "t.tenant_id = h.tenant_id", "h.use_at = 'Y'",
                "delivery.customer_id AS \"customerId\"",
                "delivery.sales_delivery_id = h.sales_delivery_id",
                "delivery.tenant_id = h.tenant_id")
                .doesNotContain("h.customer_id AS \"customerId\"");
        String readDetails = configuration.getMappedStatement("SalesStatementDAO.selectDetails")
                .getBoundSql(params).getSql();
        assertThat(readDetails).contains("salesDeliveryDetailId", "sourceDeliveryNo", "sourceDeliveryDt");
    }
}
