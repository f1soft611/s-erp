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

    private String read(Path path) throws Exception {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }
}
