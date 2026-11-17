package egovframework.let.materials.arrival.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class MaterialArrivalMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/arrival/create/EgovMaterialArrivalCreate_SQL_postgresql.xml";
    private static final String ORDER_RESOURCE =
            "egovframework/mapper/let/materials/order/create/EgovPurchaseOrderCreate_SQL_postgresql.xml";

    @Test
    void everyStatementIsTenantScoped() throws Exception {
        Configuration configuration = parse(RESOURCE);
        for (String id : Arrays.asList("selectCandidates", "selectOrderRows", "insertArrivalHeader",
                "insertArrivalDetail", "selectArrival", "selectArrivalDetails", "selectArrivalForUpdate",
                "updateArrivalHeader", "updateArrivalDetail", "deleteArrivalDetail", "cancelArrivalHeader")) {
            assertThat(sql(configuration, "MaterialArrivalDAO." + id, null)).as(id)
                    .containsPattern("tenant_id = \\?|material_arrival_id, tenant_id");
        }
    }

    @Test
    void candidatesAreRemainingQuantityOfActiveNotClosedOrderRows() throws Exception {
        assertThat(sql(parse(RESOURCE), "MaterialArrivalDAO.selectCandidates", null))
                .contains("oh.use_at = 'Y'", "od.receipt_close_at = 'N'", "ah.use_at = 'Y'",
                        "od.order_qty - COALESCE(a.arrived_qty, 0) > 0", "AS remainQty", "AS arrivedQty",
                        "oh.tax_type AS taxType", "od.inspect_at AS inspectAt", "LIMIT 500");
    }

    @Test
    void orderRowsLockOnlyWhenRequestedAndCountOnlyActiveArrivals() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialArrivalDAO.selectOrderRows", params(Boolean.TRUE)))
                .contains("ORDER BY od.purchase_order_detail_id", "FOR UPDATE OF od", "ah.use_at = 'Y'",
                        "AS arrivedQty", "AS receiptCloseAt", "oh.use_at AS orderUseAt");
        assertThat(sql(configuration, "MaterialArrivalDAO.selectOrderRows", params(Boolean.FALSE)))
                .doesNotContain("FOR UPDATE");
    }

    @Test
    void arrivalRowsStoreSeparateAmountsAndLinkToTheOrderRow() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialArrivalDAO.insertArrivalHeader", null))
                .contains("tb_material_arrival_hd", "tax_type", "vat_included_at", "receiver_id",
                        "RETURNING material_arrival_id");
        assertThat(sql(configuration, "MaterialArrivalDAO.insertArrivalDetail", null))
                .contains("tb_material_arrival_dt", "purchase_order_detail_id", "inspect_at", "supply_amt",
                        "vat_amt", "total_amt", "manufacture_dt", "expire_dt", "lot_no",
                        "RETURNING material_arrival_detail_id");
    }

    @Test
    void updateAndCancelStatementsKeepHistoryAndGuardActiveArrivals() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialArrivalDAO.selectArrivalForUpdate", null)).contains("FOR UPDATE OF ah");
        assertThat(sql(configuration, "MaterialArrivalDAO.updateArrivalHeader", null))
                .contains("tb_material_arrival_hd", "use_at = 'Y'", "updated_by = ?", "total_amt = ?");
        assertThat(sql(configuration, "MaterialArrivalDAO.cancelArrivalHeader", null))
                .contains("use_at = 'N'", "AND use_at = 'Y'").doesNotContain("DELETE");
        assertThat(sql(configuration, "MaterialArrivalDAO.updateArrivalDetail", null))
                .contains("line_no = ?", "material_arrival_id = ?", "supply_amt = ?", "expire_dt");
        assertThat(sql(configuration, "MaterialArrivalDAO.selectArrivalDetails", null))
                .contains("AS orderQty", "AS remainQty", "a2.material_arrival_detail_id <> ad.material_arrival_detail_id",
                        "ah2.use_at = 'Y'", "AS lotNo");
    }

    @Test
    void orderMapperCountsArrivedQuantityOfActiveArrivalsPerOrderRow() throws Exception {
        assertThat(sql(parse(ORDER_RESOURCE), "PurchaseOrderDAO.selectArrivedQtyByOrderDetail", params(Boolean.FALSE)))
                .contains("tb_material_arrival_dt", "tb_material_arrival_hd", "ah.use_at = 'Y'",
                        "ah.tenant_id = ?", "GROUP BY ad.purchase_order_detail_id", "AS arrivedQty");
    }

    private static Map<String, Object> params(Boolean forUpdate) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("detailIds", Arrays.asList(1L, 2L));
        params.put("forUpdate", forUpdate);
        return params;
    }

    private static Configuration parse(String resource) throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(resource)) {
            new XMLMapperBuilder(input, configuration, resource, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private static String sql(Configuration configuration, String id, Map<String, Object> params) {
        Map<String, Object> bound = params == null ? params(Boolean.TRUE) : params;
        return configuration.getMappedStatement(id).getBoundSql(bound).getSql().replaceAll("\\s+", " ");
    }
}
