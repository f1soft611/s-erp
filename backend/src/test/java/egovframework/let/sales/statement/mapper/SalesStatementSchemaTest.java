package egovframework.let.sales.statement.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class SalesStatementSchemaTest {
    @Test
    void schemaCopiesMatchAndEnforceTenantScopedActiveDeliveryUniqueness() throws Exception {
        String schema = identical("20261109_007_create_sales_statement.sql");
        assertThat(schema).contains("FOREIGN KEY (sales_delivery_id, tenant_id)",
                "REFERENCES public.tb_sales_delivery_hd (sales_delivery_id, tenant_id)",
                "ON public.tb_sales_statement_hd (tenant_id, sales_delivery_id) WHERE use_at = 'Y'",
                "FOREIGN KEY (sales_statement_id, tenant_id)");
    }

    @Test
    void menuScriptsMatchAndRequireExplicitTenant() throws Exception {
        String menus = identical("20261109_008_seed_company_statement_menus.sql");
        assertThat(menus).contains("v_tenant_id BIGINT := NULL", "RAISE EXCEPTION",
                "'CO_COMMON'", "'CO_COMPANY_INFO'", "'SALES_DELIVERY'",
                "'SALES_STATEMENT_CREATE'", "'SALES_STATEMENT_STATUS'",
                "r.tenant_id = v_tenant_id");
        assertThat(identical("20261109_008_rollback_company_statement_menus.sql"))
                .contains("RAISE EXCEPTION");
    }

    @Test
    void stampMigrationAndRollbackCopiesMatch() throws Exception {
        assertThat(identical("20261109_009_company_statement_stamp.sql"))
                .contains("tb_tenant ADD COLUMN stamp_image TEXT", "tb_sales_statement_hd ADD COLUMN supplier_stamp_image TEXT");
        assertThat(identical("20261109_009_company_statement_stamp_rollback.sql"))
                .contains("DROP COLUMN supplier_stamp_image", "DROP COLUMN stamp_image");
        identical("20261109_009_company_statement_stamp_change.md");
    }

    private String identical(String name) throws Exception {
        Path backend = Paths.get("DATABASE", "20261109", name);
        Path docs = Paths.get("..", "docs", "database", "20261109", name);
        byte[] first = Files.readAllBytes(backend);
        assertThat(first).isEqualTo(Files.readAllBytes(docs));
        return new String(first, StandardCharsets.UTF_8);
    }
}
