package egovframework.let.materials.receipt.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

/** 입고 스키마·메뉴 SQL 스크립트의 핵심 내용과 backend/docs 사본 일치를 정적으로 확인한다. */
class PurchaseReceiptSchemaScriptTest {

    private static final String BACKEND_DIR = "DATABASE/20261117/";
    private static final String DOCS_DIR = "../docs/database/20261117/";
    private static final String CREATE = "20261117_001_create_material_receipt_schema.sql";
    private static final String ROLLBACK = "20261117_001_rollback_material_receipt_schema.sql";

    private static String read(String path) throws Exception {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    @Test
    void createScriptDefinesHeaderAndDetailWithRequiredConstraints() throws Exception {
        String sql = read(BACKEND_DIR + CREATE);
        assertThat(sql).contains("CREATE TABLE public.tb_material_receipt_hd",
                "CREATE TABLE public.tb_material_receipt_dt",
                "uq_material_receipt_hd_tenant_no UNIQUE (tenant_id, receipt_no)",
                "uq_material_receipt_hd_id_tenant UNIQUE (material_receipt_id, tenant_id)",
                "ck_material_receipt_hd_tax_vat CHECK (tax_type = 'TAXABLE' OR vat_included_at = 'N')",
                "fk_material_receipt_dt_hd FOREIGN KEY (material_receipt_id, tenant_id)",
                "material_arrival_detail_id BIGINT,",
                "REFERENCES public.tb_material_arrival_dt (material_arrival_detail_id) ON DELETE SET NULL",
                "arrival_no VARCHAR(30) NOT NULL",
                "REFERENCES public.tb_purchase_order_dt (purchase_order_detail_id)",
                "ck_material_receipt_dt_receipt_qty CHECK (receipt_qty > 0)",
                "ck_material_receipt_dt_unit_price CHECK (unit_price >= 0)",
                "lot_no VARCHAR(50)", "manufacture_dt DATE", "expire_dt DATE",
                "supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0",
                "total_amt NUMERIC(15,2) NOT NULL DEFAULT 0");
        // 가입고 행 하나에 입고 여러 건(분할)이 가능하도록 연결 컬럼에는 유일 제약을 걸지 않는다.
        assertThat(sql).doesNotContain("UNIQUE (material_arrival_detail_id)");
        assertThat(sql).doesNotContain("real_receipt_qty", "location", "inspect_at");
        assertThat(sql.indexOf("BEGIN;")).isGreaterThanOrEqualTo(0).isLessThan(sql.indexOf("COMMIT;"));
    }

    @Test
    void rollbackDropsDetailBeforeHeader() throws Exception {
        String sql = read(BACKEND_DIR + ROLLBACK);
        assertThat(sql.indexOf("tb_material_receipt_dt")).isGreaterThan(0)
                .isLessThan(sql.indexOf("tb_material_receipt_hd"));
    }

    @Test
    void receiptCreateMenuIsAfterArrivalStatusAndCopiesArrivalCreatePermissions() throws Exception {
        String seed = read(BACKEND_DIR + "20261117_002_seed_material_receipt_menu.sql");
        assertThat(seed).contains("'MATERIALS_RECEIPT_CREATE'", "'/materials/receipt/receipt-create'", ", 30, 'Y',",
                "menu_code = 'MATERIALS_RECEIPT'", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'MATERIALS_ARRIVAL_CREATE'", "('READ', 'UPDATE')");
        String rollback = read(BACKEND_DIR + "20261117_002_rollback_material_receipt_menu.sql");
        assertThat(rollback).contains("menu_code = 'MATERIALS_RECEIPT_CREATE'", "tb_user_menu_favorite");
        assertThat(rollback).doesNotContain("menu_code = 'MATERIALS_RECEIPT'\n");
    }

    @Test
    void receiptStatusMenuFollowsReceiptCreateWithReadAndExcel() throws Exception {
        String seed = read(BACKEND_DIR + "20261117_003_seed_material_receipt_status_menu.sql");
        assertThat(seed).contains("'MATERIALS_RECEIPT_STATUS'", "'/materials/receipt/receipt-status'", ", 40, 'Y',",
                "menu_code = 'MATERIALS_RECEIPT'", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'MATERIALS_ARRIVAL_STATUS'", "('READ', 'EXCEL')");
        String rollback = read(BACKEND_DIR + "20261117_003_rollback_material_receipt_status_menu.sql");
        assertThat(rollback).contains("menu_code = 'MATERIALS_RECEIPT_STATUS'", "tb_user_menu_favorite");
    }

    @Test
    void inspectionLinkScriptAddsTheNullableLinkColumnsWithASetNullForeignKeyAndNoUniqueConstraint() throws Exception {
        String sql = read(BACKEND_DIR + "20261117_006_add_receipt_inspection_link.sql");
        assertThat(sql).contains("ALTER TABLE public.tb_material_receipt_dt",
                "ADD COLUMN material_inspection_detail_id BIGINT", "inspection_no VARCHAR(30)",
                "fk_material_receipt_dt_inspection_dt FOREIGN KEY (material_inspection_detail_id)",
                "REFERENCES public.tb_material_inspection_dt (material_inspection_detail_id) ON DELETE SET NULL",
                "ix_material_receipt_dt_inspection_dt");
        // 같은 검사 행을 여러 입고에 나눠 입고할 수 있으므로 유일 제약을 걸지 않고, 기존 행을 위해 NOT NULL도 아니다.
        assertThat(sql).doesNotContain("UNIQUE", "NOT NULL");
        String rollback = read(BACKEND_DIR + "20261117_006_rollback_receipt_inspection_link.sql");
        assertThat(rollback).contains("DROP INDEX IF EXISTS public.ix_material_receipt_dt_inspection_dt",
                "DROP CONSTRAINT IF EXISTS fk_material_receipt_dt_inspection_dt", "DROP COLUMN IF EXISTS inspection_no",
                "DROP COLUMN IF EXISTS material_inspection_detail_id");
        assertThat(rollback.indexOf("DROP CONSTRAINT")).isLessThan(rollback.indexOf("DROP COLUMN"));
    }

    @Test
    void docsCopiesMatchBackendScripts() throws Exception {
        for (String name : new String[] {
                CREATE, ROLLBACK, "20261117_001_change_material_receipt_schema.md",
                "20261117_006_add_receipt_inspection_link.sql", "20261117_006_rollback_receipt_inspection_link.sql",
                "20261117_006_change_receipt_inspection_link.md",
                "20261117_002_seed_material_receipt_menu.sql", "20261117_002_rollback_material_receipt_menu.sql",
                "20261117_002_change_material_receipt_menu.md",
                "20261117_003_seed_material_receipt_status_menu.sql",
                "20261117_003_rollback_material_receipt_status_menu.sql",
                "20261117_003_change_material_receipt_status_menu.md" }) {
            Path backend = Paths.get(BACKEND_DIR + name);
            Path docs = Paths.get(DOCS_DIR + name);
            assertThat(Files.exists(backend)).as(name).isTrue();
            assertThat(read(docs.toString())).as(name).isEqualTo(read(backend.toString()));
        }
    }
}
