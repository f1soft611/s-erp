package egovframework.let.sales.order.create.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class SalesDestinationSchemaTest {
    @Test
    void schemaKeepsCustomerAndTenantBoundariesAndExistingOrders() throws Exception {
        Path backend = Paths.get("DATABASE", "20261123", "20261123_003_create_sales_destination.sql");
        Path docs = Paths.get("..", "docs", "database", "20261123", backend.getFileName().toString());
        byte[] bytes = Files.readAllBytes(backend);
        assertThat(bytes).containsExactly(Files.readAllBytes(docs));
        String sql = new String(bytes, StandardCharsets.UTF_8);
        assertThat(sql).contains("CREATE TABLE public.tb_sales_destination",
                "FOREIGN KEY (customer_id, tenant_id)",
                "UNIQUE (sales_destination_id, customer_id, tenant_id)",
                "FOREIGN KEY (sales_destination_id, customer_id, tenant_id)",
                "FOREIGN KEY (billing_customer_id, tenant_id)",
                "ADD COLUMN sales_destination_id BIGINT",
                "ADD COLUMN billing_customer_id BIGINT");
        assertThat(sql).doesNotContain("DROP COLUMN delivery_place", "TRUNCATE");
    }
}
