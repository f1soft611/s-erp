package egovframework.let.materials.receipt.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class MaterialReceiptMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/receipt/create/EgovMaterialReceiptCreate_SQL_postgresql.xml";
    private static final String ARRIVAL_RESOURCE =
            "egovframework/mapper/let/materials/arrival/create/EgovMaterialArrivalCreate_SQL_postgresql.xml";

    @Test
    void everyStatementIsTenantScoped() throws Exception {
        Configuration configuration = parse(RESOURCE);
        for (String id : Arrays.asList("insertReceiptHeader", "insertReceiptDetail", "selectReceiptForUpdate",
                "selectReceipt", "selectReceiptDetails", "updateReceiptHeader", "updateReceiptDetail",
                "deleteReceiptDetail", "cancelReceiptHeader")) {
            assertThat(sql(configuration, "MaterialReceiptDAO." + id)).as(id)
                    .containsPattern("tenant_id = \\?|material_receipt_id, tenant_id|tenant_id");
        }
    }

    @Test
    void receiptRowsStoreAmountsAndTheArrivalLinkWithItsNumber() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialReceiptDAO.insertReceiptHeader"))
                .contains("tb_material_receipt_hd", "tax_type", "vat_included_at", "receiver_id",
                        "RETURNING material_receipt_id");
        assertThat(sql(configuration, "MaterialReceiptDAO.insertReceiptDetail"))
                .contains("tb_material_receipt_dt", "material_arrival_detail_id", "arrival_no",
                        "purchase_order_detail_id", "receipt_qty", "supply_amt", "vat_amt", "total_amt",
                        "manufacture_dt", "expire_dt", "lot_no", "RETURNING material_receipt_detail_id");
    }

    @Test
    void insertStatementsFlushTheSessionCacheSoTheArrivalRowsShowTheNewReceiptInTheSameTransaction() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(configuration.getMappedStatement("MaterialReceiptDAO.insertReceiptHeader").isFlushCacheRequired())
                .isTrue();
        assertThat(configuration.getMappedStatement("MaterialReceiptDAO.insertReceiptDetail").isFlushCacheRequired())
                .isTrue();
    }

    @Test
    void updateAndCancelStatementsKeepHistoryAndGuardActiveReceipts() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialReceiptDAO.selectReceiptForUpdate")).contains("FOR UPDATE OF rh");
        assertThat(sql(configuration, "MaterialReceiptDAO.updateReceiptHeader"))
                .contains("tb_material_receipt_hd", "use_at = 'Y'", "updated_by = ?", "total_amt = ?");
        assertThat(sql(configuration, "MaterialReceiptDAO.cancelReceiptHeader"))
                .contains("use_at = 'N'", "AND use_at = 'Y'").doesNotContain("DELETE");
        assertThat(sql(configuration, "MaterialReceiptDAO.updateReceiptDetail"))
                .contains("line_no = ?", "material_receipt_id = ?", "supply_amt = ?", "expire_dt");
    }

    @Test
    void receiptDetailsLeftJoinTheArrivalSoCanceledHistoryStaysReadable() throws Exception {
        assertThat(sql(parse(RESOURCE), "MaterialReceiptDAO.selectReceiptDetails"))
                .contains("LEFT JOIN tb_material_arrival_dt ad", "LEFT JOIN tb_material_arrival_hd ah",
                        "ah.use_at AS arrivalActive", "ad.inspect_at AS inspectAt", "AS remainQty",
                        "ah2.use_at = 'Y'", "AS arrivalQty", "AS receiptQty", "AS lotNo");
    }

    @Test
    void inspectionPassQuantitiesAreCandidatesUntilTheyAreFullyReceivedExcludingCanceledReceipts() throws Exception {
        Configuration configuration = parse(RESOURCE);
        String candidates = sql(configuration, "MaterialReceiptDAO.selectCandidates", params());
        assertThat(candidates).contains("ih.use_at = 'Y'", "ah.use_at = 'Y'", "rh.use_at = 'Y'", "AS receivableQty",
                "AS receivedQty", "idt.pass_qty - COALESCE(rcv.received_qty, 0) > 0", "AS supplierName",
                "AS taxType", "ad.unit_price AS unitPrice", "LIMIT 500");
        assertThat(candidates).doesNotContain("rh.use_at = 'N'");
        assertThat(sql(configuration, "MaterialReceiptDAO.countCandidates", params()))
                .contains("count(*)", "ih.use_at = 'Y'").doesNotContain("LIMIT");
    }

    @Test
    void inspectionRowLookupLocksRowAndHeaderInIdOrderAndCanExcludeTheReceiptBeingEdited() throws Exception {
        Configuration configuration = parse(RESOURCE);
        Map<String, Object> locking = params();
        locking.put("detailIds", Arrays.asList(31L, 32L));
        locking.put("forUpdate", Boolean.TRUE);
        locking.put("excludeReceiptId", 900L);
        String locked = sql(configuration, "MaterialReceiptDAO.selectInspectionRows", locking);
        assertThat(locked).contains("ORDER BY idt.material_inspection_detail_id", "FOR UPDATE OF idt, ih",
                "rh.material_receipt_id <> ?", "rh.use_at = 'Y'", "AS inspectionUseAt", "AS arrivalUseAt");
        Map<String, Object> reading = params();
        reading.put("detailIds", Arrays.asList(31L));
        reading.put("forUpdate", Boolean.FALSE);
        assertThat(sql(configuration, "MaterialReceiptDAO.selectInspectionRows", reading))
                .doesNotContain("FOR UPDATE", "rh.material_receipt_id <> ?");
    }

    @Test
    void receiptRowsStoreAndExposeTheInspectionLinkAndTheReceivableLimit() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "MaterialReceiptDAO.insertReceiptDetail", params()))
                .contains("material_inspection_detail_id", "inspection_no");
        assertThat(sql(configuration, "MaterialReceiptDAO.selectReceiptDetails", params()))
                .contains("rd.material_inspection_detail_id AS materialInspectionDetailId",
                        "rd.inspection_no AS inspectionNo", "AS receivableQty",
                        "LEFT JOIN tb_material_inspection_dt idt", "rh2.material_receipt_id <> rd.material_receipt_id");
    }

    @Test
    void arrivalRowsExposeTheActiveReceiptLinkAndCanBeRenumbered() throws Exception {
        Configuration configuration = parse(ARRIVAL_RESOURCE);
        assertThat(sql(configuration, "MaterialArrivalDAO.selectArrivalDetails"))
                .contains("tb_material_receipt_dt", "tb_material_receipt_hd", "rh.use_at = 'Y'", "AS receiptId",
                        "AS receiptNo");
        assertThat(sql(configuration, "MaterialArrivalDAO.updateArrivalDetailLineNo"))
                .contains("tb_material_arrival_dt", "line_no = ?", "material_arrival_id = ?", "tenant_id = ?");
        assertThat(sql(configuration, "MaterialArrivalDAO.selectArrivalForUpdate")).contains("AS arrivalDt");
    }

    private static Map<String, Object> params() {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
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
        return configuration.getMappedStatement(id).getBoundSql(params).getSql().replaceAll("\\s+", " ");
    }

    private static String sql(Configuration configuration, String id) {
        return configuration.getMappedStatement(id).getBoundSql(params()).getSql().replaceAll("\\s+", " ");
    }
}
