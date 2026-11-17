package egovframework.let.materials.receipt.closing;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 매입마감 매퍼 SQL과 스키마·메뉴 스크립트의 핵심 조건을 정적으로 확인한다. */
class MaterialReceiptClosingMapperTest {

    private static final String RESOURCE =
            "egovframework/mapper/let/materials/receipt/closing/EgovMaterialReceiptClosing_SQL_postgresql.xml";
    private static final String BACKEND_DIR = "DATABASE/20261117/";
    private static final String DOCS_DIR = "../docs/database/20261117/";
    private static final String[] SCRIPTS = {
            "20261117_007_add_receipt_closing_columns.sql", "20261117_007_rollback_receipt_closing_columns.sql",
            "20261117_007_change_receipt_closing_columns.md", "20261117_008_seed_receipt_closing_menu.sql",
            "20261117_008_rollback_receipt_closing_menu.sql", "20261117_008_change_receipt_closing_menu.md" };

    private Configuration configuration;

    @BeforeEach
    void setUp() throws Exception {
        configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
    }

    @Test
    void supplierSummaryCountsCanceledReceiptsOutAndMonthClosedRowsRegardlessOfReceiptDate() {
        String sql = sql("selectSuppliers", params("ALL"));
        assertThat(sql).contains("rh.tenant_id = ?", "rh.use_at = 'Y'", "AS receiptCount", "AS receiptAmount",
                "AS monthClosedCount", "AS monthClosedAmount", "AS openCount", "c.business_no AS businessNo",
                "COALESCE(rd.closing_total_amt, rd.total_amt)", "rd.closing_month = ?",
                "GROUP BY rh.supplier_id");
        // 입고일 기간 안의 행 또는 선택 마감월로 마감된 행만 대상이다.
        assertThat(sql).contains("OR rd.closing_month = ?)");
    }

    @Test
    void rowListShowsClosingValuesForClosedRowsAndReceiptValuesForOpenRows() {
        String all = sql("selectRows", params("ALL"));
        assertThat(all).contains("COALESCE(rd.closing_unit_price, rd.unit_price) AS unitPrice",
                "COALESCE(rd.closing_tax_type, rh.tax_type) AS taxType",
                "COALESCE(rd.closing_vat_included_at, rh.vat_included_at) AS vatIncludedAt",
                "COALESCE(rd.closing_total_amt, rd.total_amt) AS totalAmt", "(rd.closing_month IS NOT NULL) AS closed",
                "rh.use_at = 'Y'", "rh.receipt_dt BETWEEN");
        assertThat(all).doesNotContain("rd.closing_month IS NULL", "AND rd.closing_month = ?");

        String open = sql("selectRows", params("OPEN"));
        assertThat(open).contains("rh.receipt_dt BETWEEN", "AND rd.closing_month IS NULL");

        String closed = sql("selectRows", params("CLOSED"));
        assertThat(closed).contains("AND rd.closing_month = ?").doesNotContain("rh.receipt_dt BETWEEN");
    }

    @Test
    void rowListOptionalFiltersAreAppliedOnlyWhenGiven() {
        Map<String, Object> bare = params("ALL");
        assertThat(sql("selectRows", bare)).doesNotContain("rh.supplier_id =", "oh.order_no ILIKE", "m.material_code ILIKE");
        Map<String, Object> filtered = params("ALL");
        filtered.put("supplierId", 7L);
        filtered.put("orderNo", "PO");
        filtered.put("keyword", "볼트");
        assertThat(sql("selectRows", filtered)).contains("rh.supplier_id = ?", "oh.order_no ILIKE", "m.material_code ILIKE");
    }

    @Test
    void lockingQueryLocksHeaderThenDetailInStableOrderAndIsTenantScoped() {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("detailIds", Arrays.asList(1L, 2L));
        String sql = sql("selectRowsForUpdate", params);
        assertThat(sql).contains("rh.tenant_id = ?", "rd.material_receipt_detail_id IN ( ? , ? )",
                "ORDER BY rh.material_receipt_id, rd.material_receipt_detail_id", "FOR UPDATE OF rh, rd",
                "rd.closing_month AS closingMonth", "rh.use_at AS useAt", "rd.receipt_qty AS receiptQty");
    }

    @Test
    void closeOnlyTouchesOpenRowsAndReleaseOnlyClosedRowsAndTheOriginalReceiptValuesStayUntouched() {
        String close = sql("closeRow", params("ALL"));
        assertThat(close).contains("SET closing_month = ?", "closed_at = now()", "closing_unit_price = ?",
                "closing_total_amt = ?", "AND tenant_id = ?", "AND closing_month IS NULL");
        // 입고 행의 원래 단가·금액 컬럼(closing_ 접두어가 없는 컬럼)은 갱신하지 않는다.
        assertThat(close).doesNotContainPattern("(?<![a-z_])(unit_price|supply_amt|vat_amt|total_amt) = ");

        String release = sql("releaseRow", params("ALL"));
        assertThat(release).contains("closing_month = NULL", "closed_at = NULL", "closed_by = NULL",
                "closing_unit_price = NULL", "closing_tax_type = NULL", "closing_vat_included_at = NULL",
                "closing_supply_amt = NULL", "closing_vat_amt = NULL", "closing_total_amt = NULL",
                "AND closing_month IS NOT NULL", "AND tenant_id = ?");
    }

    @Test
    void schemaScriptAddsNineColumnsConstraintsAndIndexAndRollbackReversesThem() throws Exception {
        String add = read(BACKEND_DIR + SCRIPTS[0]);
        assertThat(add).contains("ADD COLUMN closing_month VARCHAR(6)", "ADD COLUMN closed_at TIMESTAMP",
                "ADD COLUMN closed_by VARCHAR(100)", "closing_unit_price NUMERIC(15, 2)",
                "closing_tax_type VARCHAR(20)", "closing_vat_included_at CHAR(1)", "closing_supply_amt NUMERIC(15, 2)",
                "closing_vat_amt NUMERIC(15, 2)", "closing_total_amt NUMERIC(15, 2)",
                "ck_material_receipt_dt_closing_month", "ck_material_receipt_dt_closing_tax_type",
                "ck_material_receipt_dt_closing_vat_included", "ck_material_receipt_dt_closing_complete",
                "ix_material_receipt_dt_closing_month", "(tenant_id, closing_month)");
        assertThat(add.indexOf("BEGIN;")).isGreaterThanOrEqualTo(0).isLessThan(add.indexOf("COMMIT;"));

        String rollback = read(BACKEND_DIR + SCRIPTS[1]);
        assertThat(rollback).contains("DROP INDEX IF EXISTS public.ix_material_receipt_dt_closing_month",
                "DROP CONSTRAINT IF EXISTS ck_material_receipt_dt_closing_complete",
                "DROP COLUMN IF EXISTS closing_month", "DROP COLUMN IF EXISTS closing_total_amt");
        // 제약을 먼저, 컬럼은 그 뒤에 지운다.
        assertThat(rollback.indexOf("DROP CONSTRAINT")).isLessThan(rollback.indexOf("DROP COLUMN"));
    }

    @Test
    void menuScriptIsUnderTheReceiptGroupAfterReceiptStatusAndRollbackOnlyRemovesTheScreen() throws Exception {
        String seed = read(BACKEND_DIR + SCRIPTS[3]);
        assertThat(seed).contains("'MATERIALS_RECEIPT_CLOSING'", "'/materials/receipt/receipt-closing'", ", 50, 'Y',",
                "menu_code = 'MATERIALS_RECEIPT'", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "('READ', 'UPDATE', 'EXCEL')", "source.menu_code = 'MATERIALS_RECEIPT_CREATE'",
                "source.menu_code = 'MATERIALS_RECEIPT_STATUS'");
        String rollback = read(BACKEND_DIR + SCRIPTS[4]);
        assertThat(rollback).contains("menu_code = 'MATERIALS_RECEIPT_CLOSING'", "tb_user_menu_favorite");
        assertThat(rollback).doesNotContain("'MATERIALS_RECEIPT'\n");
    }

    @Test
    void backendAndDocsCopiesAreIdentical() throws Exception {
        for (String name : SCRIPTS) {
            assertThat(read(DOCS_DIR + name)).as(name).isEqualTo(read(BACKEND_DIR + name));
        }
    }

    private static Map<String, Object> params(String closeType) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", 1L);
        params.put("closeType", closeType);
        params.put("closingMonth", "202611");
        params.put("receiptFrom", "2026-11-01");
        params.put("receiptTo", "2026-11-30");
        return params;
    }

    private String sql(String id, Map<String, Object> params) {
        return configuration.getMappedStatement("MaterialReceiptClosingDAO." + id).getBoundSql(params).getSql()
                .replaceAll("\\s+", " ");
    }

    private static String read(String path) throws Exception {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }
}
