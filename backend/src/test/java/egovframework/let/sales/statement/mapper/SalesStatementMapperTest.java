package egovframework.let.sales.statement.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesStatementMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/sales/statement/EgovSalesStatement_SQL_postgresql.xml";

    @Test
    void statementMapperScopesSnapshotsAndQueriesToTenantWithSealFallback() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
            assertThat(input).as("statement mapper resource").isNotNull();
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        for (String id : new String[] { "selectHeader", "selectDetails", "selectStatus",
                "lockDelivery", "insertHeader", "insertDetails", "updateHeader", "deleteHeader" }) {
            BoundSql sql = configuration.getMappedStatement("SalesStatementDAO." + id)
                    .getBoundSql(java.util.Collections.emptyMap());
            assertThat(sql.getSql()).as(id).containsIgnoringCase("tenant_id");
        }
        String header = configuration.getMappedStatement("SalesStatementDAO.insertHeader")
                .getBoundSql(java.util.Collections.emptyMap()).getSql();
        assertThat(header).contains("t.president_name", "t.address", "c.business_no", "h.total_amt",
                "supplier_stamp_image", "t.stamp_image");
        String detail = configuration.getMappedStatement("SalesStatementDAO.insertDetails")
                .getBoundSql(java.util.Collections.emptyMap()).getSql();
        assertThat(detail).contains("d.delivery_qty", "d.unit_price", "d.supply_amt", "d.vat_amt", "d.total_amt", "m.material_spec");
        String read = configuration.getMappedStatement("SalesStatementDAO.selectHeader")
                .getBoundSql(java.util.Collections.emptyMap()).getSql();
        assertThat(read).contains("h.supplier_name", "h.customer_name", "COALESCE(h.supplier_stamp_image, t.stamp_image)",
                "t.tenant_id = h.tenant_id", "h.use_at = 'Y'")
                .doesNotContain("JOIN tb_customer_info");
    }
}
