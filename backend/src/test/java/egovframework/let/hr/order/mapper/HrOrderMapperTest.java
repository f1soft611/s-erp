package egovframework.let.hr.order.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class HrOrderMapperTest {

    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/hr/order/HrOrder_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private String sql(String id, Map<String, Object> params) {
        BoundSql bound = configuration.getMappedStatement("HrOrderDAO." + id).getBoundSql(params);
        return bound.getSql().replaceAll("\\s+", " ").trim();
    }

    @Test
    void historyIsAppendOnlySoThereAreNoUpdateOrDeleteStatements() {
        for (Object name : configuration.getMappedStatementNames()) {
            String id = String.valueOf(name);
            if (id.startsWith("HrOrderDAO.")) {
                String statement = sql(id.substring("HrOrderDAO.".length()), new HashMap<String, Object>());
                assertThat(statement).doesNotContain("UPDATE ").doesNotContain("DELETE ");
            }
        }
    }

    @Test
    void insertsReturnTheHeaderIdAndWriteBothTables() {
        assertThat(sql("insertOrderHd", new HashMap<String, Object>())).contains("INSERT INTO tb_hr_order_hd")
                .contains("RETURNING order_id");
        assertThat(sql("insertOrderDt", new HashMap<String, Object>())).contains("INSERT INTO tb_hr_order_dt")
                .contains("pre_name", "post_name");
    }

    @Test
    void historyIsTenantScopedFilteredAndLimited() {
        Map<String, Object> none = new HashMap<>();
        none.put("tenantId", 1L);
        String base = sql("selectHistory", none);
        assertThat(base).contains("h.tenant_id = ?").contains("ORDER BY h.created_at DESC, h.order_id DESC, d.order_dt_id ASC")
                .contains("LIMIT 500").doesNotContain("ILIKE").doesNotContain("h.order_type = ?");

        Map<String, Object> all = new HashMap<>(none);
        all.put("fromDt", new Timestamp(0));
        all.put("toDt", new Timestamp(1000));
        all.put("keyword", "홍");
        all.put("orderType", "TRANSFER");
        all.put("source", "ORDER");
        String filtered = sql("selectHistory", all);
        assertThat(filtered).contains("h.created_at >= ?", "h.created_at < ?", "u.user_nm ILIKE", "u.employee_no ILIKE",
                "h.order_type = ?", "h.order_source = ?");
    }
}
