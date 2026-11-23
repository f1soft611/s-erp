package egovframework.let.sales.master.destination.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;

class SalesDestinationMenuScriptTest {
    @Test
    void menuSeedIsTenantScopedAndDoesNotGrantRolesAutomatically() throws Exception {
        Path file = Paths.get("DATABASE", "20261123", "20261123_003_seed_sales_destination_menu.sql");
        byte[] bytes = Files.readAllBytes(file);
        assertThat(bytes).containsExactly(Files.readAllBytes(
                Paths.get("..", "docs", "database", "20261123", file.getFileName().toString())));
        String sql = new String(bytes, StandardCharsets.UTF_8);
        assertThat(sql).contains("v_tenant_id BIGINT := NULL", "SALES_MASTER", "SALES_DESTINATION",
                "/sales/master/destinations", "tb_menu_permission");
        assertThat(sql).doesNotContain("DELETE FROM", "UPDATE public.tb_role",
                "INSERT INTO public.tb_role_menu_permission");
    }
}
