package egovframework.let.materials.arrival.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

/** 가입고 스키마·메뉴 SQL 스크립트의 핵심 내용과 backend/docs 사본 일치를 정적으로 확인한다. */
class PurchaseArrivalSchemaScriptTest {

    private static final String BACKEND_DIR = "DATABASE/20261116/";
    private static final String DOCS_DIR = "../docs/database/20261116/";
    private static final String CREATE = "20261116_002_create_material_arrival_schema.sql";
    private static final String ROLLBACK = "20261116_002_rollback_material_arrival_schema.sql";

    private static String read(String path) throws Exception {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    @Test
    void createScriptDefinesHeaderAndDetailWithRequiredConstraints() throws Exception {
        String sql = read(BACKEND_DIR + CREATE);
        assertThat(sql).contains("CREATE TABLE public.tb_material_arrival_hd",
                "CREATE TABLE public.tb_material_arrival_dt",
                "uq_material_arrival_hd_tenant_no UNIQUE (tenant_id, arrival_no)",
                "uq_material_arrival_hd_id_tenant UNIQUE (material_arrival_id, tenant_id)",
                "ck_material_arrival_hd_tax_vat CHECK (tax_type = 'TAXABLE' OR vat_included_at = 'N')",
                "tax_type VARCHAR(20) NOT NULL DEFAULT 'TAXABLE'",
                "vat_included_at CHAR(1) NOT NULL DEFAULT 'N'",
                "fk_material_arrival_dt_hd FOREIGN KEY (material_arrival_id, tenant_id)",
                "REFERENCES public.tb_purchase_order_dt (purchase_order_detail_id)",
                "ck_material_arrival_dt_arrival_qty CHECK (arrival_qty > 0)",
                "unit_price NUMERIC(15,2) NOT NULL",
                "ck_material_arrival_dt_unit_price CHECK (unit_price >= 0)",
                "inspect_at CHAR(1) NOT NULL DEFAULT 'N'",
                "lot_no VARCHAR(50)",
                "manufacture_dt DATE", "expire_dt DATE",
                "supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "total_amt NUMERIC(15,2) NOT NULL DEFAULT 0");
        assertThat(sql).doesNotContain("real_arrival_qty", "location", "scm_");
        assertThat(sql.indexOf("BEGIN;")).isGreaterThanOrEqualTo(0).isLessThan(sql.indexOf("COMMIT;"));
    }

    @Test
    void rollbackDropsDetailBeforeHeader() throws Exception {
        String sql = read(BACKEND_DIR + ROLLBACK);
        assertThat(sql.indexOf("tb_material_arrival_dt")).isGreaterThan(0)
                .isLessThan(sql.indexOf("tb_material_arrival_hd"));
    }

    @Test
    void menuScriptsCreateReceiptGroupAndArrivalCreateMenuWithReadAndUpdate() throws Exception {
        String seed = read(BACKEND_DIR + "20261116_003_seed_material_arrival_menu.sql");
        assertThat(seed).contains("'MATERIALS_RECEIPT', '입고관리'", "'/materials/receipt'",
                "'MATERIALS_ARRIVAL_CREATE'", "'/materials/arrival/arrival-create'",
                "ON CONFLICT (tenant_id, menu_code) DO NOTHING", "source.menu_code = 'ORDER_CREATE'",
                "('READ', 'UPDATE')");
        String rollback = read(BACKEND_DIR + "20261116_003_rollback_material_arrival_menu.sql");
        assertThat(rollback).contains("menu_code = 'MATERIALS_ARRIVAL_CREATE'", "tb_user_menu_favorite",
                "NOT EXISTS (SELECT 1 FROM public.tb_menu c WHERE c.parent_menu_id = g.menu_id)");
    }

    @Test
    void statusMenuScriptTargetsArrivalStatusMenuWithReadAndExcelAfterCreate() throws Exception {
        String seed = read(BACKEND_DIR + "20261116_004_seed_material_arrival_status_menu.sql");
        assertThat(seed).contains("'MATERIALS_ARRIVAL_STATUS'", "'/materials/arrival/arrival-status'", ", 20, 'Y',",
                "menu_code = 'MATERIALS_RECEIPT'", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'ORDER_STATUS'", "('READ', 'EXCEL')");
        String rollback = read(BACKEND_DIR + "20261116_004_rollback_material_arrival_status_menu.sql");
        assertThat(rollback).contains("menu_code = 'MATERIALS_ARRIVAL_STATUS'", "tb_user_menu_favorite");
        assertThat(rollback).doesNotContain("MATERIALS_ORDER_STATUS");
    }

    @Test
    void docsCopiesMatchBackendScripts() throws Exception {
        for (String name : new String[] {
                CREATE, ROLLBACK, "20261116_002_change_material_arrival_schema.md",
                "20261116_003_seed_material_arrival_menu.sql", "20261116_003_rollback_material_arrival_menu.sql",
                "20261116_003_change_material_arrival_menu.md",
                "20261116_004_seed_material_arrival_status_menu.sql",
                "20261116_004_rollback_material_arrival_status_menu.sql",
                "20261116_004_change_material_arrival_status_menu.md" }) {
            Path backend = Paths.get(BACKEND_DIR + name);
            Path docs = Paths.get(DOCS_DIR + name);
            assertThat(Files.exists(backend)).as(name).isTrue();
            assertThat(read(docs.toString())).as(name).isEqualTo(read(backend.toString()));
        }
    }
}
