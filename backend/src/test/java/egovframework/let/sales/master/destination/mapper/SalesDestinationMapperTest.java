package egovframework.let.sales.master.destination.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class SalesDestinationMapperTest {
    @Test
    void everyLookupAndMutationIsTenantScoped() throws Exception {
        String path = "egovframework/mapper/let/sales/master/destination/SalesDestination_SQL_postgresql.xml";
        Configuration config = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(path)) {
            new XMLMapperBuilder(input, config, path, config.getSqlFragments()).parse();
        }
        for (String id : Arrays.asList("customerExists", "customers", "list", "find", "insert", "update", "countOrders", "delete")) {
            String sql = config.getMappedStatement("SalesDestinationDAO." + id)
                    .getBoundSql(new HashMap<String, Object>()).getSql();
            assertThat(sql).as(id).contains("tenant_id");
        }
        assertThat(config.getMappedStatement("SalesDestinationDAO.update")
                .getBoundSql(new HashMap<String, Object>()).getSql())
                .contains("customer_id =");
    }
}
