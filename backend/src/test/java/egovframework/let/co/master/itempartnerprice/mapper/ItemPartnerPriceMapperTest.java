package egovframework.let.co.master.itempartnerprice.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLConfigBuilder;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.scripting.defaults.DefaultParameterHandler;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ItemPartnerPriceMapperTest {
    private static final String CONFIG = "egovframework/mapper/config/mapper-config.xml";
    private static final String MAPPER =
            "egovframework/mapper/let/co/master/itempartnerprice/ItemPartnerPrice_SQL_postgresql.xml";

    @ParameterizedTest
    @ValueSource(strings = {"insertItemPartnerPrice", "updateItemPartnerPrice"})
    void bindsAbsentMoqAsNumericNull(String statement) throws Exception {
        verifyMoqBinding(statement, null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"insertItemPartnerPrice", "updateItemPartnerPrice"})
    void bindsZeroAndDecimalMoqAsNumbers(String statement) throws Exception {
        verifyMoqBinding(statement, BigDecimal.ZERO);
        verifyMoqBinding(statement, new BigDecimal("12.50"));
    }

    private void verifyMoqBinding(String statementId, BigDecimal moq) throws Exception {
        Configuration configuration;
        try (InputStream input = Resources.getResourceAsStream(CONFIG)) {
            configuration = new XMLConfigBuilder(input).parse();
        }
        try (InputStream input = Resources.getResourceAsStream(MAPPER)) {
            new XMLMapperBuilder(input, configuration, MAPPER, configuration.getSqlFragments()).parse();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("priceId", 44L);
        params.put("materialId", 101L);
        params.put("customerId", 202L);
        params.put("tradeType", "매입");
        params.put("unitPrice", new BigDecimal("1250.50"));
        params.put("currency", "KRW");
        params.put("startDt", "2026-10-30");
        params.put("endDt", null);
        params.put("moq", moq);
        params.put("useAt", "Y");
        params.put("createdBy", "101");
        params.put("updatedBy", "101");
        MappedStatement statement = configuration.getMappedStatement("ItemPartnerPriceDAO." + statementId);
        BoundSql sql = statement.getBoundSql(params);
        PreparedStatement jdbc = mock(PreparedStatement.class);

        new DefaultParameterHandler(statement, params, sql).setParameters(jdbc);

        int moqIndex = -1;
        for (int i = 0; i < sql.getParameterMappings().size(); i++) {
            if ("moq".equals(sql.getParameterMappings().get(i).getProperty())) {
                moqIndex = i + 1;
                break;
            }
        }
        assertThat(moqIndex).isPositive();
        if (moq == null) {
            verify(jdbc).setNull(moqIndex, Types.NUMERIC);
        } else {
            verify(jdbc).setBigDecimal(moqIndex, moq);
        }
    }
}
