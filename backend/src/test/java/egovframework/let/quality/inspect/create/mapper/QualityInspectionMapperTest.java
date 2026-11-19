package egovframework.let.quality.inspect.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class QualityInspectionMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/quality/inspect/create/EgovQualityInspectionCreate_SQL_postgresql.xml";
    private static final String ARRIVAL_RESOURCE =
            "egovframework/mapper/let/materials/arrival/create/EgovPurchaseArrivalCreate_SQL_postgresql.xml";
    private static final String RECEIPT_RESOURCE =
            "egovframework/mapper/let/materials/receipt/create/EgovPurchaseReceiptCreate_SQL_postgresql.xml";

    @Test
    void everyStatementIsTenantScoped() throws Exception {
        Configuration configuration = parse(RESOURCE);
        for (String id : Arrays.asList("selectCandidates", "countWaitingCandidates", "selectArrivalRows",
                "selectInspector", "insertInspectionHeader", "insertInspectionDetail", "selectInspectionForUpdate",
                "selectInspection", "selectInspectionDetails", "updateInspectionHeader", "updateInspectionDetail",
                "deleteInspectionDetail", "cancelInspectionHeader")) {
            Map<String, Object> scoped = params();
            scoped.put("detailIds", Arrays.asList(1L));
            scoped.put("forUpdate", Boolean.FALSE);
            assertThat(sql(configuration, "QualityInspectionDAO." + id, scoped)).as(id)
                    .containsPattern("tenant_id = \\?|quality_inspection_id, tenant_id|tenant_id");
        }
    }

    @Test
    void candidatesAreInspectionTargetsOfActiveArrivalsWithWaitingQuantityLeft() throws Exception {
        Configuration configuration = parse(RESOURCE);
        String candidates = sql(configuration, "QualityInspectionDAO.selectCandidates", params());
        assertThat(candidates).contains("ad.inspect_at = 'Y'", "ah.use_at = 'Y'", "ih.use_at = 'Y'",
                "AS waitQty", "AS inspectedQty", "> 0", "LIMIT 500");
        // 취소된 검사는 검사량에 포함하지 않으므로 합계 서브쿼리가 정상 검사만 센다.
        assertThat(candidates).doesNotContain("ih.use_at = 'N'");
        assertThat(sql(configuration, "QualityInspectionDAO.countWaitingCandidates", params()))
                .contains("count(*)", "ad.inspect_at = 'Y'", "ah.use_at = 'Y'").doesNotContain("LIMIT");
    }

    @Test
    void candidateFiltersApplyOnlyWhenGiven() throws Exception {
        Configuration configuration = parse(RESOURCE);
        Map<String, Object> filtered = params();
        filtered.put("fromDt", java.time.LocalDate.of(2026, 11, 1));
        filtered.put("supplierKeyword", "한빛");
        String withFilters = sql(configuration, "QualityInspectionDAO.selectCandidates", filtered);
        assertThat(withFilters).contains("ah.arrival_dt >=", "c.customer_name ILIKE");
        assertThat(sql(configuration, "QualityInspectionDAO.selectCandidates", params()))
                .doesNotContain("ah.arrival_dt >=", "c.customer_name ILIKE");
    }

    @Test
    void arrivalRowLookupLocksInIdOrderAndCanExcludeTheInspectionBeingEdited() throws Exception {
        Configuration configuration = parse(RESOURCE);
        Map<String, Object> locking = params();
        locking.put("detailIds", Arrays.asList(21L, 22L));
        locking.put("forUpdate", Boolean.TRUE);
        locking.put("excludeInspectionId", 900L);
        String locked = sql(configuration, "QualityInspectionDAO.selectArrivalRows", locking);
        assertThat(locked).contains("ORDER BY ad.purchase_arrival_detail_id", "FOR UPDATE OF ad",
                "ih.quality_inspection_id <> ?", "ih.use_at = 'Y'", "AS arrivalUseAt", "AS inspectAt");
        Map<String, Object> reading = params();
        reading.put("detailIds", Arrays.asList(21L));
        reading.put("forUpdate", Boolean.FALSE);
        String read = sql(configuration, "QualityInspectionDAO.selectArrivalRows", reading);
        assertThat(read).doesNotContain("FOR UPDATE", "ih.quality_inspection_id <> ?");
    }

    @Test
    void insertsStoreQuantitiesAndTheArrivalLinkWithItsNumberAndFlushTheSessionCache() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "QualityInspectionDAO.insertInspectionHeader", params()))
                .contains("tb_quality_inspection_hd", "inspector_id", "RETURNING quality_inspection_id");
        assertThat(sql(configuration, "QualityInspectionDAO.insertInspectionDetail", params()))
                .contains("tb_quality_inspection_dt", "purchase_arrival_detail_id", "arrival_no",
                        "purchase_order_detail_id", "pass_qty", "fail_qty",
                        "RETURNING quality_inspection_detail_id");
        assertThat(configuration.getMappedStatement("QualityInspectionDAO.insertInspectionHeader")
                .isFlushCacheRequired()).isTrue();
        assertThat(configuration.getMappedStatement("QualityInspectionDAO.insertInspectionDetail")
                .isFlushCacheRequired()).isTrue();
    }

    @Test
    void updateAndCancelStatementsKeepHistoryAndGuardActiveInspections() throws Exception {
        Configuration configuration = parse(RESOURCE);
        assertThat(sql(configuration, "QualityInspectionDAO.selectInspectionForUpdate", params()))
                .contains("FOR UPDATE OF ih");
        assertThat(sql(configuration, "QualityInspectionDAO.updateInspectionHeader", params()))
                .contains("tb_quality_inspection_hd", "use_at = 'Y'", "updated_by = ?", "inspector_id = ?");
        assertThat(sql(configuration, "QualityInspectionDAO.cancelInspectionHeader", params()))
                .contains("use_at = 'N'", "AND use_at = 'Y'").doesNotContain("DELETE");
        assertThat(sql(configuration, "QualityInspectionDAO.updateInspectionDetail", params()))
                .contains("line_no = ?", "pass_qty = ?", "fail_qty = ?", "quality_inspection_id = ?");
        assertThat(sql(configuration, "QualityInspectionDAO.selectInspector", params()))
                .contains("u.use_at = 'Y'", "u.tenant_id = ?");
    }

    @Test
    void inspectionDetailsLeftJoinTheArrivalAndExposeTheLimitExcludingThisInspection() throws Exception {
        assertThat(sql(parse(RESOURCE), "QualityInspectionDAO.selectInspectionDetails", params()))
                .contains("LEFT JOIN tb_purchase_arrival_dt ad", "LEFT JOIN tb_purchase_arrival_hd ah",
                        "AS arrivalLinked", "AS otherInspectedQty", "AS maxQty", "AS inspectQty",
                        "o.quality_inspection_id <> ?", "oi.use_at = 'Y'");
    }

    @Test
    void inspectionDetailsExposeTheReceivedQuantityAndTheLatestActiveReceiptNumber() throws Exception {
        assertThat(sql(parse(RESOURCE), "QualityInspectionDAO.selectInspectionDetails", params()))
                .contains("AS receivedQty", "AS receiptNo", "tb_purchase_receipt_dt", "tb_purchase_receipt_hd",
                        "rh.use_at = 'Y'", "ORDER BY rh.purchase_receipt_id DESC");
    }

    @Test
    void orderRemainingQuantityAddsBackTheFailedQuantityOfActiveInspections() throws Exception {
        Configuration arrival = parse(ARRIVAL_RESOURCE);
        Map<String, Object> orderRows = params();
        orderRows.put("detailIds", Arrays.asList(11L));
        orderRows.put("forUpdate", Boolean.FALSE);
        for (String sql : new String[] {
                sql(arrival, "PurchaseArrivalDAO.selectCandidates", params()),
                sql(arrival, "PurchaseArrivalDAO.selectOrderRows", orderRows),
                sql(arrival, "PurchaseArrivalDAO.selectArrivalDetails", params()),
                sql(parse(RECEIPT_RESOURCE), "PurchaseReceiptDAO.selectReceiptDetails", params()) }) {
            assertThat(sql).contains("tb_quality_inspection_dt", "fail_qty", "ih.use_at = 'Y'");
        }
    }

    @Test
    void arrivalRowsExposeTheActiveInspectionLink() throws Exception {
        assertThat(sql(parse(ARRIVAL_RESOURCE), "PurchaseArrivalDAO.selectArrivalDetails", params()))
                .contains("AS inspectionId", "AS inspectionNo", "tb_quality_inspection_hd");
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
}
