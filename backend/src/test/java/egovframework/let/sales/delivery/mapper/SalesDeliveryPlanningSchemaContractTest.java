package egovframework.let.sales.delivery.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class SalesDeliveryPlanningSchemaContractTest {
    private static final String MIGRATION =
            "20261105_002_add_sales_delivery_planning.sql";
    private static final String LABEL_MIGRATION =
            "20261106_004_change_sales_shipment_labels.sql";

    @Test
    void shipmentPlanMenusAreReparentedWithoutReplacingTheirIds() throws Exception {
        String file = "20261109_001_move_sales_shipment_plan_menus.sql";
        Path docsFile = Paths.get("..", "docs", "database", "20261109", file);
        Path backendFile = Paths.get("DATABASE", "20261109", file);
        assertThat(Files.exists(docsFile)).as("menu correction migration").isTrue();
        String sql = read(docsFile);
        assertThat(sql).contains("SALES_DELIVERY_PLAN_CREATE", "SALES_DELIVERY_PLAN_STATUS",
                "SALES_DELIVERY", "parent_menu_id", "RAISE EXCEPTION", "ON CONFLICT");
        assertThat(sql).doesNotContain("DELETE FROM public.tb_role_menu_permission");
        assertThat(Files.readAllBytes(backendFile)).containsExactly(Files.readAllBytes(docsFile));
    }

    @Test
    void migrationAddsTenantModeAndBackfillsPlanLinksBeforeEnforcingThem() throws Exception {
        Path migration = Paths.get("..", "docs", "database", "20261105", MIGRATION);
        assertThat(Files.exists(migration)).as("migration file").isTrue();
        String sql = read(migration);

        assertThat(sql).contains(
                "delivery_plan_mode",
                "DEFAULT 'AUTO'",
                "CREATE TABLE public.tb_sales_delivery_plan_hd",
                "CREATE TABLE public.tb_sales_delivery_plan_dt",
                "sales_delivery_plan_detail_id",
                "UPDATE public.tb_sales_delivery_dt",
                "ROW_NUMBER() OVER",
                "COALESCE(d.delivery_dt, h.delivery_dt)",
                "delivered_qty",
                "uq_sales_delivery_dt_plan_source",
                "fk_sales_delivery_dt_plan_source");
        assertThat(sql.indexOf("UPDATE public.tb_sales_delivery_dt"))
                .isLessThan(sql.indexOf("ADD CONSTRAINT fk_sales_delivery_dt_plan_source"));
    }

    @Test
    void docsAndBackendMigrationCopiesAreIdentical() throws Exception {
        for (String file : new String[] {
                MIGRATION,
                "20261105_002_seed_sales_delivery_plan_menu.sql",
                "20261105_002_rollback_sales_delivery_planning.sql",
                "20261105_002_rollback_sales_delivery_plan_menu.sql",
                "20261105_002_change_sales_delivery_planning_schema.md",
                "20261105_003_add_over_delivery_policy.sql",
                "20261105_003_rollback_over_delivery_policy.sql",
                "20261105_003_change_over_delivery_policy_schema.md"
        }) {
            Path docsFile = Paths.get("..", "docs", "database", "20261105", file);
            Path backendFile = Paths.get("DATABASE", "20261105", file);
            assertThat(Files.exists(docsFile)).as("docs " + file).isTrue();
            assertThat(Files.exists(backendFile)).as("backend " + file).isTrue();
            assertThat(Files.readAllBytes(backendFile))
                    .as("identical copy of " + file)
                    .containsExactly(Files.readAllBytes(docsFile));
        }

    }

    @Test
    void overDeliveryMigrationPreservesNonnegativeCountersAndGuardsRollback() throws Exception {
        String sql = read(Paths.get("..", "docs", "database", "20261105",
                "20261105_003_add_over_delivery_policy.sql"));
        assertThat(sql).contains("DEFAULT 'BLOCK'", "'BLOCK', 'WARN'",
                "DROP CONSTRAINT ck_sales_delivery_plan_dt_delivered",
                "delivered_qty >= 0", "delivered_qty <> 'NaN'::numeric");
        String rollback = read(Paths.get("..", "docs", "database", "20261105",
                "20261105_003_rollback_over_delivery_policy.sql"));
        assertThat(rollback).contains("delivered_qty > planned_qty", "shipped_qty > order_qty",
                "RAISE EXCEPTION", "LOCK TABLE", "DROP COLUMN over_delivery_policy");
    }

    @Test
    void shipmentLabelMigrationChangesOnlyApprovedLabelsAndHasGuardedIdenticalCopies() throws Exception {
        Path docsDirectory = Paths.get("..", "docs", "database", "20261106");
        Path backendDirectory = Paths.get("DATABASE", "20261106");
        String migration = read(docsDirectory.resolve(LABEL_MIGRATION));
        String rollback = read(docsDirectory.resolve("20261106_004_rollback_sales_shipment_labels.sql"));

        assertThat(migration).contains(
                "BEGIN;",
                "UPDATE public.tb_menu",
                "SET menu_nm = CASE menu_code",
                "menu_dc = CASE menu_code",
                "SALES_DELIVERY",
                "SALES_DELIVERY_CREATE",
                "SALES_DELIVERY_STATUS",
                "SALES_DELIVERY_PLAN",
                "SALES_DELIVERY_PLAN_CREATE",
                "SALES_DELIVERY_PLAN_STATUS",
                "UPDATE public.tb_system_policy",
                "system_policy_at = 'Y'",
                "DELIVERY_PLAN_MODE",
                "OVER_DELIVERY_POLICY",
                "RAISE EXCEPTION",
                "COMMIT;");
        assertThat(migration).doesNotContain(
                "INSERT INTO", "DELETE FROM", "tb_menu_permission", "tb_role_menu_permission",
                "menu_url =", "policy_code =", "category_nm =", "value_json =",
                "options_json =", "version =");
        assertThat(rollback).contains(
                "BEGIN;",
                "UPDATE public.tb_menu",
                "UPDATE public.tb_system_policy",
                "IS DISTINCT FROM",
                "RAISE EXCEPTION",
                "COMMIT;");

        for (String file : new String[] {
                LABEL_MIGRATION,
                "20261106_004_rollback_sales_shipment_labels.sql",
                "20261106_004_change_sales_shipment_labels.md"
        }) {
            Path docsFile = docsDirectory.resolve(file);
            Path backendFile = backendDirectory.resolve(file);
            assertThat(Files.exists(docsFile)).as("docs " + file).isTrue();
            assertThat(Files.exists(backendFile)).as("backend " + file).isTrue();
            assertThat(Files.readAllBytes(backendFile))
                    .as("identical copy of " + file)
                    .containsExactly(Files.readAllBytes(docsFile));
        }
    }

    private String read(Path path) throws Exception {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }
}
