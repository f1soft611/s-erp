package egovframework.let.system.policies.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.util.StreamUtils;

class SystemPolicySqlContractTest {

    private static final String PREFIX = "20261105_004_";
    private static final String DDL = PREFIX + "create_system_policy_schema.sql";
    private static final String MENU = PREFIX + "seed_system_policy_menu.sql";
    private static final String ROLLBACK = PREFIX + "rollback_system_policy_schema.sql";
    private static final String MENU_ROLLBACK = PREFIX + "rollback_system_policy_menu.sql";
    private static final String CHANGE = PREFIX + "change_system_policy_schema.md";

    @Test
    void everyMapperStatementIsTenantScopedAndUsesBoundParametersOnly() throws Exception {
        Map<String, String> statements = statements();
        assertThat(statements).containsKeys("selectPolicyList", "selectPolicyById", "selectPolicyByIdForUpdate",
                "selectPolicyIdByCode", "selectTenantPolicyValuesForUpdate", "existsDeliveryPlanHeader",
                "insertPolicy", "updatePolicy", "updateTenantDeliveryPlanMode", "updateTenantOverDeliveryPolicy",
                "deletePolicy", "insertPolicyHistory", "selectPolicyHistoryList", "selectActiveUsers",
                "countActiveUsersByIds");
        for (Map.Entry<String, String> entry : statements.entrySet()) {
            assertThat(entry.getValue()).as(entry.getKey()).containsPattern("tenant_id\\s*=\\s*#\\{tenantId");
        }
        assertThat(mapperXml()).doesNotContain("${");
    }

    @Test
    void mapperLocksVersionsAndReadsBuiltInValuesFromTenantColumns() throws Exception {
        Map<String, String> s = statements();
        assertThat(s.get("selectPolicyByIdForUpdate")).contains("FOR UPDATE OF p");
        assertThat(s.get("selectTenantPolicyValuesForUpdate")).contains("FOR UPDATE");
        assertThat(s.get("selectPolicyList")).contains("t.delivery_plan_mode", "t.over_delivery_policy", "system_policy_at = 'Y'");
        assertThat(s.get("selectPolicyById")).contains("t.delivery_plan_mode", "t.over_delivery_policy");
        assertThat(s.get("updatePolicy")).contains("version = version + 1").containsPattern("version\\s*=\\s*#\\{version");
        assertThat(s.get("deletePolicy")).contains("system_policy_at = 'N'").containsPattern("version\\s*=\\s*#\\{version");
        assertThat(s.get("updateTenantDeliveryPlanMode")).contains("SET delivery_plan_mode = #{value}");
        assertThat(s.get("updateTenantOverDeliveryPolicy")).contains("SET over_delivery_policy = #{value}");
        assertThat(s.get("selectPolicyHistoryList")).contains("LIMIT 50");
        assertThat(s.get("selectActiveUsers")).contains("LIMIT 50", "use_at = 'Y'", "ESCAPE")
                .doesNotContain("email_addr", "mobile_no", "login_id");
        assertThat(s.get("countActiveUsersByIds")).contains("use_at = 'Y'", "<foreach");
    }

    @Test
    void ddlCreatesTenantScopedPolicyAndHistoryAndPreservesCurrentBuiltInValues() throws Exception {
        String sql = read(Paths.get("..", "docs", "database", "20261105", DDL));
        assertThat(sql).contains(
                "CREATE TABLE public.tb_system_policy (",
                "CREATE TABLE public.tb_system_policy_history (",
                "UNIQUE (tenant_id, policy_code)",
                "value_json JSONB NOT NULL",
                "options_json JSONB NOT NULL",
                "version INTEGER NOT NULL",
                "'BOOLEAN', 'NUMBER', 'SELECT', 'TEXT', 'DATE', 'USER_LIST'",
                "to_jsonb(t.delivery_plan_mode)",
                "to_jsonb(t.over_delivery_policy)",
                "ON CONFLICT (tenant_id, policy_code) DO NOTHING");
        String history = sql.substring(sql.indexOf("CREATE TABLE public.tb_system_policy_history"));
        history = history.substring(0, history.indexOf(");"));
        assertThat(history).doesNotContain("REFERENCES public.tb_system_policy").doesNotContain("CASCADE");
        assertThat(sql).doesNotContain("UPDATE public.tb_tenant");
    }

    @Test
    void menuSeedGrantsOnlyExistingPlatformAdminRoleAndRollbacksAreGuarded() throws Exception {
        String menu = read(Paths.get("..", "docs", "database", "20261105", MENU));
        assertThat(menu).contains("'/settings/system/policies'", "'ST_SYSTEM'", "'SETTINGS'", "r.role_code = 'PLATFORM_ADMIN'")
                .doesNotContain("INSERT INTO public.tb_role ", "tb_login_account", "TENANT_ADMIN");
        String rollback = read(Paths.get("..", "docs", "database", "20261105", ROLLBACK));
        assertThat(rollback.indexOf("RAISE EXCEPTION")).isGreaterThan(0)
                .isLessThan(rollback.indexOf("DROP TABLE"));
        assertThat(rollback).contains("system_policy_at = 'N'", "tb_system_policy_history");
        String menuRollback = read(Paths.get("..", "docs", "database", "20261105", MENU_ROLLBACK));
        assertThat(menuRollback.indexOf("RAISE EXCEPTION")).isGreaterThan(0)
                .isLessThan(menuRollback.indexOf("DELETE FROM"));
    }

    @Test
    void docsAndBackendCopiesAreIdentical() throws Exception {
        for (String file : new String[] { DDL, MENU, ROLLBACK, MENU_ROLLBACK, CHANGE }) {
            Path docsFile = Paths.get("..", "docs", "database", "20261105", file);
            Path backendFile = Paths.get("DATABASE", "20261105", file);
            assertThat(Files.exists(docsFile)).as("docs " + file).isTrue();
            assertThat(Files.exists(backendFile)).as("backend " + file).isTrue();
            assertThat(Files.readAllBytes(backendFile)).as(file).containsExactly(Files.readAllBytes(docsFile));
        }
    }

    private Map<String, String> statements() throws Exception {
        Matcher matcher = Pattern.compile("<(select|update|delete|insert)\\s+id=\"(\\w+)\"[^>]*>(.*?)</\\1>", Pattern.DOTALL)
                .matcher(mapperXml());
        Map<String, String> result = new HashMap<>();
        while (matcher.find()) {
            result.put(matcher.group(2), matcher.group(3));
        }
        return result;
    }

    private String mapperXml() throws Exception {
        try (InputStream stream = getClass().getClassLoader()
                .getResourceAsStream("egovframework/mapper/let/system/policies/EgovSystemPolicy_SQL_postgresql.xml")) {
            return StreamUtils.copyToString(Objects.requireNonNull(stream, "mapper"), StandardCharsets.UTF_8);
        }
    }

    private String read(Path path) throws Exception {
        assertThat(Files.exists(path)).as(path.toString()).isTrue();
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }
}