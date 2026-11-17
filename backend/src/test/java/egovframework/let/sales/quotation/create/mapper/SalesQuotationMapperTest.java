package egovframework.let.sales.quotation.create.mapper;

import static org.assertj.core.api.Assertions.*;
import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.type.JdbcType;
import org.junit.jupiter.api.Test;

class SalesQuotationMapperTest {
    @Test
    void scopedQueriesUseActiveHeadersAndPreserveSnapshots() throws Exception {
        Configuration c = parse("create/EgovSalesQuotationCreate_SQL_postgresql.xml");
        for (String id : Arrays.asList("selectHeader", "selectForUpdate", "selectDetails", "updateHeader", "softDelete", "selectOptions")) {
            String sql = c.getMappedStatement("SalesQuotationDAO." + id).getBoundSql(new HashMap<>()).getSql();
            assertThat(sql).as(id).contains("tenant_id = ?", "use_at = 'Y'");
        }
        String details = c.getMappedStatement("SalesQuotationDAO.selectDetails").getBoundSql(new HashMap<>()).getSql();
        assertThat(details).contains("d.material_name", "d.material_code").doesNotContain("tb_material_info");
        BoundSql insert = c.getMappedStatement("SalesQuotationDAO.insertDetail").getBoundSql(new HashMap<>());
        assertThat(insert.getParameterMappings()).filteredOn(p -> p.getProperty().equals("materialId"))
                .singleElement().extracting(p -> p.getJdbcType()).isEqualTo(JdbcType.NUMERIC);
        assertThat(c.getMappedStatement("SalesQuotationDAO.softDelete").getBoundSql(new HashMap<>()).getSql())
                .contains("use_at = 'N'", "created_by = ?");
    }

    @Test
    void statusAndOptionsBindFiltersAndTenant() throws Exception {
        Configuration status = parse("status/EgovSalesQuotationStatus_SQL_postgresql.xml");
        Map<String, Object> params = new HashMap<>();
        params.put("materialKeyword", "x"); params.put("customerKeyword", "x"); params.put("quotationNo", "x");
        params.put("submitDtFrom", java.time.LocalDate.now()); params.put("submitDtTo", java.time.LocalDate.now());
        String sql = status.getMappedStatement("SalesQuotationStatusDAO.selectList").getBoundSql(params).getSql();
        assertThat(sql).contains("h.tenant_id = ?", "h.use_at = 'Y'", "d.tenant_id = h.tenant_id",
                "d.material_name ILIKE", "h.submit_dt", "h.quotation_no ILIKE");
        Configuration create = parse("create/EgovSalesQuotationCreate_SQL_postgresql.xml");
        params.put("customerId", 1L); params.put("keyword", "x");
        String options = create.getMappedStatement("SalesQuotationDAO.selectOptions").getBoundSql(params).getSql();
        assertThat(options).contains("h.customer_id = ?", "h.quotation_no ILIKE", "c.customer_name ILIKE");
    }

    private Configuration parse(String path) throws Exception {
        String name = "egovframework/mapper/let/sales/quotation/" + path;
        Configuration config = new Configuration();
        try (InputStream in = Resources.getResourceAsStream(name)) {
            new XMLMapperBuilder(in, config, name, config.getSqlFragments()).parse();
        }
        return config;
    }

    @Test
    void integratedKeywordBindsFiveOrColumnsWithinTenantAndDateFilters() throws Exception {
        Configuration config = parse("status/EgovSalesQuotationStatus_SQL_postgresql.xml");
        Map<String, Object> params = new HashMap<>();
        params.put("keyword", "bolt");
        BoundSql bound = config.getMappedStatement("SalesQuotationStatusDAO.selectList").getBoundSql(params);
        String sql = bound.getSql().replaceAll("\\s+", " ");
        assertThat(sql).contains("AND (h.quotation_no ILIKE", "OR c.customer_code ILIKE",
                "OR c.customer_name ILIKE", "OR d.material_code ILIKE", "OR d.material_name ILIKE",
                "h.tenant_id = ?", "h.use_at = 'Y'");
        assertThat(bound.getParameterMappings()).filteredOn(p -> p.getProperty().equals("keyword")).hasSize(5);
        params.put("keyword", null);
        assertThat(config.getMappedStatement("SalesQuotationStatusDAO.selectList")
                .getBoundSql(params).getParameterMappings())
                .noneMatch(p -> p.getProperty().equals("keyword"));
    }
}
