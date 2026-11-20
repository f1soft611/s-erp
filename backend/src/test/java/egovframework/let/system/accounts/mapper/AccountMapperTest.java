package egovframework.let.system.accounts.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AccountMapperTest {

    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/system/accounts/Account_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private String sql(String id, Map<String, Object> params) {
        return configuration.getMappedStatement("AccountDAO." + id).getBoundSql(params)
                .getSql().replaceAll("\\s+", " ").trim();
    }

    private Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    @Test
    void listIsTenantScopedAndNeverReadsThePasswordHashOrImageBody() {
        String sql = sql("selectAccountList", params("tenantId", 1L, "status", "ALL"));

        assertThat(sql).contains("la.tenant_id = ?")
                .doesNotContain("password_hash").doesNotContain("la.profile_image AS").doesNotContain("photo_image AS");
        assertThat(sql).contains("(u.photo_image IS NOT NULL OR la.profile_image IS NOT NULL) AS has_photo");
    }

    @Test
    void statusFiltersMatchTheStatusDefinitions() {
        String active = sql("selectAccountList", params("tenantId", 1L, "status", "ACTIVE"));
        String disabled = sql("selectAccountList", params("tenantId", 1L, "status", "DISABLED"));
        String locked = sql("selectAccountList", params("tenantId", 1L, "status", "LOCKED"));
        String retired = sql("selectAccountList", params("tenantId", 1L, "status", "RETIRED"));
        String all = sql("selectAccountList", params("tenantId", 1L, "status", "ALL"));

        assertThat(active).contains("AND la.use_at = 'Y' AND la.locked_at IS NULL AND NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)");
        assertThat(disabled).contains("AND la.use_at = 'N'");
        assertThat(locked).contains("AND la.use_at = 'Y' AND la.locked_at IS NOT NULL");
        assertThat(retired).contains("AND (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE) ORDER BY");
        assertThat(all).doesNotContain("la.locked_at IS NULL").doesNotContain("la.use_at = 'N'");
    }

    @Test
    void keywordSearchesNameLoginIdEmployeeNoDepartmentAndPosition() {
        String sql = sql("selectAccountList", params("tenantId", 1L, "status", "ALL", "keyword", "홍"));

        assertThat(sql).contains("u.user_nm ILIKE", "la.login_code ILIKE", "u.employee_no ILIKE",
                "d.department_nm ILIKE", "pi.item_nm ILIKE");
    }

    @Test
    void otherAdminCountIgnoresDisabledAndRetiredAccountsAndTheTarget() {
        String sql = sql("selectOtherAdminCount",
                params("tenantId", 1L, "loginId", 5L, "adminRoleCodes", Arrays.asList("ADMIN", "TENANT_ADMIN")));

        assertThat(sql).contains("la.login_id <> ?").contains("la.use_at = 'Y'")
                .contains("NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)")
                .contains("r.role_code IN ( ? , ? )");
    }

    @Test
    void passwordResetForcesAChangeAndClearsTheLock() {
        String sql = sql("updatePasswordReset", params("tenantId", 1L, "loginId", 5L));

        assertThat(sql).contains("password_change_required = 'Y'").contains("locked_at = NULL")
                .contains("login_attempt_count = 0").contains("tenant_id = ?");
    }

    @Test
    void writesAreTenantScopedAndRecordTheActor() {
        for (String id : new String[] {"updateUseAt", "updateUnlock", "touchAccount", "updatePasswordReset"}) {
            String sql = sql(id, params("tenantId", 1L, "loginId", 5L));
            assertThat(sql).as(id).contains("tenant_id = ?").contains("updated_by = ?");
        }
        assertThat(sql("deleteAccountRoles", params("tenantId", 1L, "loginId", 5L)))
                .contains("SELECT login_id FROM tb_login_account WHERE tenant_id = ?");
        assertThat(sql("insertAccountRole", params("tenantId", 1L, "loginId", 5L, "roleId", 4L)))
                .contains("r.tenant_id = ?").contains("r.use_at = 'Y'");
    }
}
