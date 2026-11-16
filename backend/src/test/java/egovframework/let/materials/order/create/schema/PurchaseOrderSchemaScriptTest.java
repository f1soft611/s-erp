package egovframework.let.materials.order.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

/** 발주 스키마·메뉴 SQL 스크립트의 핵심 내용과 backend/docs 사본 일치를 정적으로 확인한다. */
class PurchaseOrderSchemaScriptTest {

    private static final String BACKEND_DIR = "DATABASE/20261113/";
    private static final String DOCS_DIR = "../docs/database/20261113/";
    private static final String CREATE = "20261113_002_create_purchase_order_schema.sql";
    private static final String ROLLBACK = "20261113_002_rollback_purchase_order_schema.sql";

    private static String read(String path) throws Exception {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    @Test
    void createScriptDefinesHeaderAndDetailWithRequiredConstraints() throws Exception {
        String sql = read(BACKEND_DIR + CREATE);
        assertThat(sql).contains("CREATE TABLE public.tb_purchase_order_hd", "CREATE TABLE public.tb_purchase_order_dt",
                "uq_purchase_order_hd_tenant_no UNIQUE (tenant_id, order_no)",
                "uq_purchase_order_hd_id_tenant UNIQUE (purchase_order_id, tenant_id)",
                "ck_purchase_order_hd_source_type CHECK (source_type IN ('CONFIRM', 'DIRECT'))",
                "ck_purchase_order_hd_tax_vat CHECK (tax_type = 'TAXABLE' OR vat_included_at = 'N')",
                "tax_type VARCHAR(20) NOT NULL DEFAULT 'TAXABLE'",
                "vat_included_at CHAR(1) NOT NULL DEFAULT 'N'",
                "print_at CHAR(1) NOT NULL DEFAULT 'N'",
                "fk_purchase_order_dt_hd FOREIGN KEY (purchase_order_id, tenant_id)",
                "REFERENCES public.tb_purchase_request_dt (purchase_request_detail_id)",
                "ck_purchase_order_dt_order_qty CHECK (order_qty > 0)",
                "inspect_at CHAR(1) NOT NULL DEFAULT 'N'",
                "receipt_close_at CHAR(1) NOT NULL DEFAULT 'N'",
                "supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "total_amt NUMERIC(15,2) NOT NULL DEFAULT 0");
        assertThat(sql).doesNotContain("stock_qty");
        assertThat(sql.indexOf("BEGIN;")).isGreaterThanOrEqualTo(0).isLessThan(sql.indexOf("COMMIT;"));
    }

    @Test
    void rollbackDropsDetailBeforeHeader() throws Exception {
        String sql = read(BACKEND_DIR + ROLLBACK);
        assertThat(sql.indexOf("tb_purchase_order_dt")).isGreaterThan(0)
                .isLessThan(sql.indexOf("tb_purchase_order_hd"));
    }

    @Test
    void menuScriptsTargetOrderCreateMenuUnderPurchaseGroup() throws Exception {
        String seed = read(BACKEND_DIR + "20261113_003_seed_purchase_order_menu.sql");
        assertThat(seed).contains("'MATERIALS_ORDER_CREATE'", "'/materials/order/order-create'",
                "menu_code = 'MATERIALS_PURCHASE'", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'ORDER_CREATE'");
        String rollback = read(BACKEND_DIR + "20261113_003_rollback_purchase_order_menu.sql");
        assertThat(rollback).contains("tb_role_menu_permission", "tb_menu_permission", "tb_user_menu_favorite",
                "menu_code = 'MATERIALS_ORDER_CREATE'");
    }

    @Test
    void statusMenuScriptsTargetOrderStatusMenuWithReadAndExcel() throws Exception {
        String seed = read(BACKEND_DIR + "20261113_005_seed_purchase_order_status_menu.sql");
        assertThat(seed).contains("'MATERIALS_ORDER_STATUS'", "'/materials/order/order-status'", ", 20, 'Y',",
                "menu_code = 'MATERIALS_ORDER' AND", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'ORDER_STATUS'", "('READ', 'EXCEL')");
        String rollback = read(BACKEND_DIR + "20261113_005_rollback_purchase_order_status_menu.sql");
        assertThat(rollback).contains("menu_code = 'MATERIALS_ORDER_STATUS'", "tb_user_menu_favorite");
        assertThat(rollback).doesNotContain("MATERIALS_REQUEST_STATUS");
    }

    @Test
    void menuGroupRestructureSplitsRequestAndOrderGroupsAndRollsBack() throws Exception {
        String sql = read(BACKEND_DIR + "20261113_004_restructure_materials_menu_groups.sql");
        assertThat(sql).contains("menu_nm = '구매요청관리'", "'MATERIALS_ORDER', '발주관리'", "'/materials/order'",
                "menu_code = 'MATERIALS_ORDER_CREATE'", "parent_menu_id = v_order_group",
                "ON CONFLICT (tenant_id, menu_code) DO NOTHING");
        assertThat(sql).doesNotContain("DELETE", "DROP");
        String rollback = read(BACKEND_DIR + "20261113_004_rollback_materials_menu_groups.sql");
        assertThat(rollback).contains("menu_nm = '구매관리'", "NOT EXISTS (SELECT 1 FROM public.tb_menu child",
                "menu_code = 'MATERIALS_ORDER_CREATE'");
    }

    @Test
    void printSnapshotScriptAddsNullableSnapshotAndPrintColumnsAndRollsBack() throws Exception {
        String sql = read(BACKEND_DIR + "20261113_006_alter_purchase_order_print_snapshot.sql");
        assertThat(sql).contains("ALTER TABLE public.tb_purchase_order_hd", "company_name VARCHAR(200)",
                "company_stamp_image TEXT", "company_logo_image TEXT", "vendor_name VARCHAR(200)", "vendor_charge VARCHAR(14)",
                "orderer_name VARCHAR(100)", "orderer_mobile_no VARCHAR(20)", "printed_at TIMESTAMP WITHOUT TIME ZONE",
                "printed_by VARCHAR(100)");
        assertThat(sql).doesNotContain("NOT NULL", "DROP", "DELETE");
        String rollback = read(BACKEND_DIR + "20261113_006_rollback_purchase_order_print_snapshot.sql");
        assertThat(rollback).contains("DROP COLUMN IF EXISTS company_name", "DROP COLUMN IF EXISTS printed_by",
                "DROP COLUMN IF EXISTS vendor_charge");
    }

    @Test
    void taxTypeSeedKeepsThreeCodes() throws Exception {
        String seed = read(BACKEND_DIR + "20261113_001_seed_purchase_tax_type_codes.sql");
        assertThat(seed).contains("'PURCHASE_TAX_TYPE'", "'TAXABLE'", "'ZERO_RATED'", "'EXEMPT'");
    }

    @Test
    void docsCopiesMatchBackendScripts() throws Exception {
        for (String name : new String[] {
                "20261113_001_seed_purchase_tax_type_codes.sql", "20261113_001_rollback_purchase_tax_type_codes.sql",
                "20261113_001_change_purchase_tax_type_codes.md", CREATE, ROLLBACK,
                "20261113_002_change_purchase_order_schema.md", "20261113_003_seed_purchase_order_menu.sql",
                "20261113_003_rollback_purchase_order_menu.sql", "20261113_003_change_purchase_order_menu.md",
                "20261113_004_restructure_materials_menu_groups.sql",
                "20261113_004_rollback_materials_menu_groups.sql", "20261113_004_change_materials_menu_groups.md",
                "20261113_006_alter_purchase_order_print_snapshot.sql",
                "20261113_006_rollback_purchase_order_print_snapshot.sql", "20261113_006_change_purchase_order_print_snapshot.md",
                "20261113_005_seed_purchase_order_status_menu.sql",
                "20261113_005_rollback_purchase_order_status_menu.sql",
                "20261113_005_change_purchase_order_status_menu.md" }) {
            Path backend = Paths.get(BACKEND_DIR + name);
            Path docs = Paths.get(DOCS_DIR + name);
            assertThat(Files.exists(backend)).as(name).isTrue();
            assertThat(read(docs.toString())).as(name).isEqualTo(read(backend.toString()));
        }
    }
}
