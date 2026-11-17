package egovframework.let.quality.inspect.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

/** 수입검사 스키마·메뉴 SQL 스크립트의 핵심 내용과 backend/docs 사본 일치를 정적으로 확인한다. */
class MaterialInspectionSchemaScriptTest {

    private static final String BACKEND_DIR = "DATABASE/20261117/";
    private static final String DOCS_DIR = "../docs/database/20261117/";
    private static final String CREATE = "20261117_004_create_material_inspection_schema.sql";
    private static final String ROLLBACK = "20261117_004_rollback_material_inspection_schema.sql";
    private static final String MENU = "20261117_005_seed_quality_inspect_menu.sql";
    private static final String MENU_ROLLBACK = "20261117_005_rollback_quality_inspect_menu.sql";

    private static String read(String path) throws Exception {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    @Test
    void createScriptDefinesHeaderAndDetailWithRequiredConstraints() throws Exception {
        String sql = read(BACKEND_DIR + CREATE);
        assertThat(sql).contains("CREATE TABLE public.tb_material_inspection_hd",
                "CREATE TABLE public.tb_material_inspection_dt",
                "uq_material_inspection_hd_tenant_no UNIQUE (tenant_id, inspection_no)",
                "uq_material_inspection_hd_id_tenant UNIQUE (material_inspection_id, tenant_id)",
                "fk_material_inspection_dt_hd FOREIGN KEY (material_inspection_id, tenant_id)",
                "material_arrival_detail_id BIGINT,",
                "REFERENCES public.tb_material_arrival_dt (material_arrival_detail_id) ON DELETE SET NULL",
                "arrival_no VARCHAR(30) NOT NULL",
                "REFERENCES public.tb_purchase_order_dt (purchase_order_detail_id)",
                "ck_material_inspection_dt_pass_qty CHECK (pass_qty >= 0)",
                "ck_material_inspection_dt_fail_qty CHECK (fail_qty >= 0)",
                "ck_material_inspection_dt_inspect_qty CHECK (pass_qty + fail_qty > 0)",
                "pass_qty NUMERIC(15,2) NOT NULL DEFAULT 0", "fail_qty NUMERIC(15,2) NOT NULL DEFAULT 0",
                "ck_material_inspection_hd_use_at CHECK (use_at IN ('Y', 'N'))");
        // 부분 검사로 가입고 행 하나에 검사 여러 건이 가능하도록 연결 컬럼에는 유일 제약을 걸지 않는다.
        assertThat(sql).doesNotContain("UNIQUE (material_arrival_detail_id)");
        // 첫 버전에서 뺀 항목과 입고 연결 컬럼은 만들지 않는다.
        assertThat(sql).doesNotContain("sample_qty", "inspect_method", "receipt", "inspect_qty NUMERIC");
        assertThat(sql.indexOf("BEGIN;")).isGreaterThanOrEqualTo(0).isLessThan(sql.indexOf("COMMIT;"));
    }

    @Test
    void rollbackDropsDetailBeforeHeader() throws Exception {
        String sql = read(BACKEND_DIR + ROLLBACK);
        assertThat(sql.indexOf("tb_material_inspection_dt")).isGreaterThan(0)
                .isLessThan(sql.indexOf("tb_material_inspection_hd"));
    }

    @Test
    void menuScriptRegistersTheQualityModuleGroupAndTwoScreensCopyingReceiptPermissions() throws Exception {
        String seed = read(BACKEND_DIR + MENU);
        assertThat(seed).contains("'QUALITY', '품질관리', 'ClipboardCheck', '/quality', 5, 'Y'",
                "'QUALITY_INSPECT'", "'/quality/inspect'",
                "'QUALITY_INSPECT_CREATE'", "'/quality/inspect/inspect-create'", "'자재수입검사등록'",
                "'QUALITY_INSPECT_STATUS'", "'/quality/inspect/inspect-status'", "'자재수입검사현황'",
                "ON CONFLICT (tenant_id, module_code) DO NOTHING", "ON CONFLICT (tenant_id, menu_code) DO NOTHING",
                "source.menu_code = 'MATERIALS_RECEIPT_CREATE'", "('READ', 'UPDATE')",
                "source.menu_code = 'MATERIALS_RECEIPT_STATUS'", "('READ', 'EXCEL')");
        String rollback = read(BACKEND_DIR + MENU_ROLLBACK);
        assertThat(rollback).contains("'QUALITY_INSPECT_CREATE', 'QUALITY_INSPECT_STATUS'", "tb_user_menu_favorite",
                "module_code = 'QUALITY'");
    }

    @Test
    void docsCopiesMatchBackendScripts() throws Exception {
        for (String name : new String[] {
                CREATE, ROLLBACK, "20261117_004_change_material_inspection_schema.md", MENU, MENU_ROLLBACK,
                "20261117_005_change_quality_inspect_menu.md" }) {
            assertThat(read(DOCS_DIR + name)).as(name).isEqualTo(read(BACKEND_DIR + name));
        }
    }
}
