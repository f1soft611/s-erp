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

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void listFiltersPastRowsOnlyWhenHistoryIsNotRequested(boolean includeHistory) throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("includeHistory", includeHistory);

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO.selectItemPartnerPriceList")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        assertThat(sql.contains("p.end_dt >= CURRENT_DATE")).isEqualTo(!includeHistory);
        assertThat(sql).contains("p.tax_type", "p.vat_included_at", "p.foreign_unit_price", "price_status");
    }

    @ParameterizedTest
    @ValueSource(strings = {"selectOverlappingPriceId", "closePreviousOpenPrices", "existsCommonCode"})
    void defaultPriceLookupsTreatNullCustomerAsDefaultKey(String statementId) throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("startDt", "2026-11-18");

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO." + statementId)
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        if (!"existsCommonCode".equals(statementId)) {
            assertThat(sql).contains("customer_id IS NOT DISTINCT FROM");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"ALL", "NO_PURCHASE", "NO_SALES", "HAS_SPECIAL"})
    void overviewMaterialsApplyPriceFilterAndLimit(String filter) throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("effectiveOn", "2026-11-18");
        params.put("priceFilter", filter);

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO.selectOverviewMaterials")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        assertThat(sql).contains("ORDER BY m.material_code LIMIT 2001", "m.delete_status = 'N'");
        assertThat(sql.contains("NOT EXISTS") && sql.contains("'매입'")).isEqualTo("NO_PURCHASE".equals(filter));
        assertThat(sql.contains("NOT EXISTS") && sql.contains("'매출'")).isEqualTo("NO_SALES".equals(filter));
        assertThat(sql.contains("AND EXISTS")).isEqualTo("HAS_SPECIAL".equals(filter));
    }

    @org.junit.jupiter.api.Test
    void overviewPricesOnlyReadActiveRowsOfTheRequestedItems() throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("effectiveOn", "2026-11-18");
        params.put("materialIds", java.util.Arrays.asList(1L, 2L));

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO.selectOverviewPrices")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        assertThat(sql).contains("p.use_at = 'Y'", "p.material_id IN");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ALL", "REGISTERED", "UNREGISTERED"})
    void customerOverviewCountsOnlyActiveSpecialPricesAndAppliesRegisterFilter(String filter) throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("effectiveOn", "2026-11-18");
        params.put("registerFilter", filter);
        params.put("keyword", "abc");

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO.selectCustomerOverview")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        assertThat(sql).contains("customer_id IS NOT NULL", "use_at = 'Y'", "c.use_at = 'Y'",
                "ORDER BY c.customer_code LIMIT 2001", "ILIKE");
        assertThat(sql.contains("price_count, 0) > 0")).isEqualTo("REGISTERED".equals(filter));
        assertThat(sql.contains("price_count, 0) = 0")).isEqualTo("UNREGISTERED".equals(filter));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void listFiltersByCustomerOnlyWhenRequested(boolean withCustomer) throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("includeHistory", true);
        if (withCustomer) params.put("customerId", 301L);

        String sql = configuration.getMappedStatement("ItemPartnerPriceDAO.selectItemPartnerPriceList")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        assertThat(sql.contains("p.customer_id = ?")).isEqualTo(withCustomer);
        assertThat(sql).contains("m.material_spec");
    }

    @org.junit.jupiter.api.Test
    void deleteStatementsMatchTheSpec() throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("priceId", 44L);
        params.put("startDt", "2026-11-18");

        String predecessor = configuration.getMappedStatement("ItemPartnerPriceDAO.selectPredecessorPriceId")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(predecessor).contains("customer_id IS NOT DISTINCT FROM", "use_at = 'Y'", "end_dt = CAST(? AS DATE) - 1");
        String reopen = configuration.getMappedStatement("ItemPartnerPriceDAO.reopenPrice")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(reopen).contains("UPDATE tb_item_partner_price SET end_dt = CAST(");
        String delete = configuration.getMappedStatement("ItemPartnerPriceDAO.deleteItemPartnerPrice")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(delete).contains("DELETE FROM tb_item_partner_price", "tenant_id = ?", "price_id = ?");
    }

    @org.junit.jupiter.api.Test
    void defaultSupplierStatementsAreTenantScopedAndKeepOneRowPerMaterial() throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("materialId", 101L);
        params.put("customerId", 202L);
        params.put("actor", "101");
        params.put("materialIds", java.util.Arrays.asList(101L, 102L));
        params.put("priceIds", java.util.Arrays.asList(1L, 2L));
        params.put("text", "내수");
        params.put("tradeType", "매입");
        params.put("baseDt", "2026-11-20");
        for (String id : java.util.Arrays.asList("selectDefaultSuppliers", "existsActivePurchasePrice",
                "upsertDefaultSupplier", "deleteDefaultSupplier", "deleteOrphanDefaultSuppliers",
                "selectMaterialIdsByPriceIds", "selectOrderTypeCode", "selectLookupPrice",
                "selectDefaultSupplierPrices")) {
            String sql = configuration.getMappedStatement("ItemPartnerPriceDAO." + id).getBoundSql(params).getSql()
                    .replaceAll("\\s+", " ");
            assertThat(sql).as(id).containsPattern("tenant_id = \\?|VALUES \\(\\?");
        }
        String upsert = configuration.getMappedStatement("ItemPartnerPriceDAO.upsertDefaultSupplier")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(upsert).contains("ON CONFLICT (tenant_id, material_id) DO UPDATE");
        String orphan = configuration.getMappedStatement("ItemPartnerPriceDAO.deleteOrphanDefaultSuppliers")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(orphan).contains("NOT EXISTS", "p.trade_type = '매입'", "p.use_at = 'Y'", "RETURNING d.material_id");
    }

    @org.junit.jupiter.api.Test
    void sharedLookupStatementsPickDefaultSupplierPriceBeforeCommonPrice() throws Exception {
        Configuration configuration = loadConfiguration();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("materialId", 101L);
        params.put("customerId", 202L);
        params.put("tradeType", "매입");
        params.put("baseDt", "2026-11-20");
        params.put("materialIds", java.util.Arrays.asList(101L, 102L));
        for (String id : java.util.Arrays.asList("selectLookupPrice", "selectDefaultSupplierPrices")) {
            String sql = configuration.getMappedStatement("ItemPartnerPriceDAO." + id).getBoundSql(params).getSql()
                    .replaceAll("\\s+", " ");
            assertThat(sql).as(id).contains("p.use_at = 'Y'", "p.customer_id IS NULL",
                    "ORDER BY (p.customer_id IS NULL), p.start_dt DESC, p.price_id DESC", "LIMIT 1",
                    "p.order_type", "p.foreign_unit_price");
        }
        String defaults = configuration.getMappedStatement("ItemPartnerPriceDAO.selectDefaultSupplierPrices")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(defaults).contains("tb_item_default_supplier d", "c.use_at = 'Y'", "LEFT JOIN LATERAL");
    }

    private Configuration loadConfiguration() throws Exception {
        Configuration configuration;
        try (InputStream input = Resources.getResourceAsStream(CONFIG)) {
            configuration = new XMLConfigBuilder(input).parse();
        }
        try (InputStream input = Resources.getResourceAsStream(MAPPER)) {
            new XMLMapperBuilder(input, configuration, MAPPER, configuration.getSqlFragments()).parse();
        }
        return configuration;
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
