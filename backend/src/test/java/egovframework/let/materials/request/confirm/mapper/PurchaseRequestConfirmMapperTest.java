package egovframework.let.materials.request.confirm.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class PurchaseRequestConfirmMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/request/confirm/EgovPurchaseRequestConfirm_SQL_postgresql.xml";

    @Test
    void everyStatementIsTenantScoped() throws Exception {
        Configuration configuration = parse();
        for (String id : Arrays.asList("selectCandidates", "selectDetailLocksForUpdate", "selectDetailLocks",
                "selectDetailsByIds", "selectDetailsByConfirm", "selectConfirms", "selectConfirm",
                "selectConfirmUseAtForUpdate", "selectUserId", "existsWarehouse", "existsOrderType", "existsSupplier",
                "insertConfirmHeader", "updateDetailConfirm", "refreshRequestStatuses", "updateDetailOrderClose",
                "selectRequestIdsByConfirm", "clearDetailsByConfirm", "cancelConfirmHeader")) {
            assertThat(sql(configuration, id)).as(id).containsPattern("tenant_id = \\?|tenant_id, confirm_no");
        }
    }

    @Test
    void itemConfirmLocksDetailRowsAndLinksThemToTheConfirm() throws Exception {
        Configuration configuration = parse();
        assertThat(sql(configuration, "selectDetailLocksForUpdate"))
                .containsPattern("purchase_request_detail_id IN \\(\\s*\\?\\s*,\\s*\\?\\s*\\)")
                .contains("ORDER BY d.purchase_request_detail_id", "FOR UPDATE OF d", "use_at = 'Y'");
        assertThat(sql(configuration, "selectCandidates"))
                .contains("h.status IN ('REQUESTED', 'PARTIALLY_CONFIRMED')", "d.purchase_confirm_id IS NULL",
                        "m.material_name", "m.material_spec", "m.unit", "LIMIT 500");
        assertThat(sql(configuration, "insertConfirmHeader"))
                .contains("tb_purchase_confirm_hd", "confirm_no", "currency_code", "RETURNING purchase_confirm_id");
        assertThat(sql(configuration, "updateDetailConfirm"))
                .contains("purchase_confirm_id = ?", "AND purchase_confirm_id IS NULL");
        assertThat(sql(configuration, "selectDetailsByConfirm")).contains("d.purchase_confirm_id = ?");
    }

    @Test
    void requestStatusIsRecalculatedFromDetailRows() throws Exception {
        assertThat(sql(parse(), "refreshRequestStatuses"))
                .contains("WHEN s.confirmed_count = 0 THEN 'REQUESTED'",
                        "WHEN s.confirmed_count = s.total_count THEN 'CONFIRMED'", "ELSE 'PARTIALLY_CONFIRMED'",
                        "count(d.purchase_confirm_id)", "FILTER (WHERE d.purchase_confirm_id IS NOT NULL)");
    }

    @Test
    void cancelReturnsRequestsAndKeepsConfirmHistory() throws Exception {
        Configuration configuration = parse();
        assertThat(sql(configuration, "selectConfirmUseAtForUpdate")).contains("FOR UPDATE");
        assertThat(sql(configuration, "clearDetailsByConfirm"))
                .contains("confirm_qty = NULL", "supplier_id = NULL", "order_close_at = 'N'",
                        "purchase_confirm_id = NULL", "d.purchase_confirm_id = ?");
        assertThat(sql(configuration, "selectRequestIdsByConfirm")).contains("DISTINCT d.purchase_request_id");
        assertThat(sql(configuration, "cancelConfirmHeader")).contains("use_at = 'N'", "AND use_at = 'Y'")
                .doesNotContain("DELETE");
        assertThat(sql(configuration, "updateDetailOrderClose")).contains("purchase_confirm_id = ?", "order_close_at <> ?");
    }

    @Test
    void confirmListAndPriceQueries() throws Exception {
        Configuration configuration = parse();
        assertThat(sql(configuration, "selectConfirms")).contains("pc.use_at = ?", "ORDER BY pc.confirm_dt DESC", "LIMIT 200");
        assertThat(configuration.hasStatement("selectDefaultUnitPrice")).isFalse();
        assertThat(sql(configuration, "existsTaxType")).contains("PURCHASE_TAX_TYPE");
        assertThat(sql(configuration, "updateDetailConfirm")).contains("tax_type =", "vat_included_at =");
        assertThat(sql(configuration, "clearDetailsByConfirm")).contains("tax_type = NULL", "vat_included_at = NULL");
        assertThat(sql(configuration, "existsWarehouse")).contains("disuse_at = 'N'", "use_at = 'Y'");
    }

    private String sql(Configuration configuration, String id) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 1L);
        params.put("purchaseRequestIds", Arrays.asList(5L, 6L));
        params.put("detailIds", Arrays.asList(51L, 61L));
        params.put("purchaseRequestId", 5L);
        params.put("purchaseRequestDetailId", 51L);
        params.put("purchaseConfirmId", 900L);
        params.put("id", 1L);
        params.put("code", "RAW_MATERIAL");
        params.put("loginCode", "user01");
        params.put("keyword", "MC");
        params.put("useAt", "Y");
        params.put("materialId", 12L);
        params.put("supplierId", 4L);
        params.put("baseDt", LocalDate.of(2026, 11, 12));
        params.put("confirmDt", LocalDate.of(2026, 11, 12));
        params.put("confirmNo", "MC-20261112-0001");
        params.put("totalAmt", BigDecimal.ONE);
        params.put("orderCloseAt", "Y");
        params.put("updatedBy", "user01");
        params.put("createdBy", "user01");
        return configuration.getMappedStatement("PurchaseRequestConfirmDAO." + id).getBoundSql(params).getSql()
                .replaceAll("\\s+", " ");
    }

    private Configuration parse() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }
}
