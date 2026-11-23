package egovframework.let.sales.order.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class SalesFlowResetScriptTest {
    @Test
    void resetIsTenantScopedAndDoesNotDeletePurchasingData() throws Exception {
        Path backend = Paths.get("DATABASE", "20261123", "20261123_003_reset_sales_flow.sql");
        Path docs = Paths.get("..", "docs", "database", "20261123", backend.getFileName().toString());
        byte[] bytes = Files.readAllBytes(backend);
        assertThat(bytes).containsExactly(Files.readAllBytes(docs));
        String sql = new String(bytes, StandardCharsets.UTF_8);
        assertThat(sql).contains("REPLACE_WITH_TENANT_ID", "v_tenant_id <= 0",
                "public.tb_purchase_request_dt", "ROLLBACK;");
        assertThat(sql).doesNotContain("DELETE FROM public.tb_purchase", "TRUNCATE", "RESTART IDENTITY");
        assertThat(sql).contains("DELETE FROM public.tb_sales_statement_dt",
                "DELETE FROM public.tb_sales_statement_hd", "DELETE FROM public.tb_sales_delivery_dt",
                "DELETE FROM public.tb_sales_delivery_hd", "DELETE FROM public.tb_sales_delivery_plan_dt",
                "DELETE FROM public.tb_sales_delivery_plan_hd", "DELETE FROM public.tb_sales_order_dt",
                "DELETE FROM public.tb_sales_order_hd");
        assertThat(sql).contains("WHERE tenant_id = v_tenant_id");
        assertThat(sql.indexOf("DELETE FROM public.tb_sales_statement_dt"))
                .isLessThan(sql.indexOf("DELETE FROM public.tb_sales_delivery_dt"));
        assertThat(sql.indexOf("DELETE FROM public.tb_sales_delivery_dt"))
                .isLessThan(sql.indexOf("DELETE FROM public.tb_sales_delivery_plan_dt"));
        assertThat(sql.indexOf("DELETE FROM public.tb_sales_delivery_plan_dt"))
                .isLessThan(sql.indexOf("DELETE FROM public.tb_sales_order_dt"));
    }
}
