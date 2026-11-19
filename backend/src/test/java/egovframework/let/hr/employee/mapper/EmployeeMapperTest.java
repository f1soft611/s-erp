package egovframework.let.hr.employee.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EmployeeMapperTest {

    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/hr/employee/Employee_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private String sql(String id, Map<String, Object> params) {
        BoundSql bound = configuration.getMappedStatement("EmployeeDAO." + id).getBoundSql(params);
        return bound.getSql().replaceAll("\\s+", " ").trim();
    }

    private Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    @Test
    void listIsTenantScopedAndFiltersRetiredByDate() {
        String active = sql("selectEmployeeList", params("tenantId", 1L, "status", "ACTIVE"));
        String retired = sql("selectEmployeeList", params("tenantId", 1L, "status", "RETIRED"));
        String all = sql("selectEmployeeList", params("tenantId", 1L, "status", "ALL"));

        assertThat(active).contains("u.tenant_id = ?").contains("u.use_at = 'Y'")
                .contains("AND NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)");
        assertThat(retired).contains("AND (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE) ORDER BY");
        assertThat(all).doesNotContain("retire_dt <= CURRENT_DATE) ORDER BY").doesNotContain("AND NOT (u.retire_dt");
    }

    @Test
    void employmentStatusIsComputedFromRetireSuspendAndBackDates() {
        String sql = sql("selectEmployeeById", params("tenantId", 1L, "userId", 5L));
        assertThat(sql).contains("WHEN u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE THEN 'RETIRED'")
                .contains("u.suspend_dt <= CURRENT_DATE AND (u.back_dt IS NULL OR u.back_dt > CURRENT_DATE) THEN 'LEAVE'")
                .contains("ELSE 'ACTIVE' END AS employment_status");
    }

    @Test
    void readsNeverSelectTheResidentNumberCiphertextOrHash() {
        for (String id : new String[] {"selectEmployeeList", "selectEmployeeById"}) {
            String sql = sql(id, params("tenantId", 1L, "userId", 5L, "status", "ALL", "keyword", "홍"));
            assertThat(sql).as(id).contains("u.resident_no_masked")
                    .doesNotContain("resident_no_enc").doesNotContain("resident_no_hash").doesNotContain("resident_no_key_version");
        }
    }

    @Test
    void keywordAndDepartmentFiltersAreOnlyAddedWhenGiven() {
        String plain = sql("selectEmployeeList", params("tenantId", 1L, "status", "ALL"));
        String filtered = sql("selectEmployeeList", params("tenantId", 1L, "status", "ALL", "keyword", "홍", "departmentId", 3L));

        assertThat(plain).doesNotContain("ILIKE").doesNotContain("u.department_id = ?");
        assertThat(filtered).contains("u.department_id = ?").contains("u.user_nm ILIKE '%' || ? || '%'")
                .contains("u.employee_no ILIKE").contains("la.login_code ILIKE").contains("pi.item_nm ILIKE");
    }

    @Test
    void duplicateChecksAreTenantScopedAndExcludeTheEditedEmployee() {
        for (String id : new String[] {"countEmployeeNo", "countEmail", "countResidentHash"}) {
            Map<String, Object> input = params("tenantId", 1L, "employeeNo", "261101", "emailAddr", "a@b.c",
                    "residentNoHash", "h", "excludeUserId", 7L);
            assertThat(sql(id, input)).as(id).contains("tenant_id = ?").contains("AND user_id != ?");
            input.remove("excludeUserId");
            assertThat(sql(id, input)).as(id + " without exclude").doesNotContain("user_id != ?");
        }
        assertThat(sql("countLoginCode", params("tenantId", 1L, "loginCode", "x"))).contains("tb_login_account")
                .contains("tenant_id = ?").contains("login_code = ?");
    }

    @Test
    void validatorsOnlyAcceptActiveSameTenantRows() {
        assertThat(sql("existsActiveDepartment", params("tenantId", 1L, "departmentId", 2L)))
                .contains("tenant_id = ?").contains("use_at = 'Y'");
        String code = sql("existsCommonCodeItem", params("tenantId", 1L, "groupCode", "POSITION", "itemCode", "STAFF"));
        assertThat(code).contains("g.tenant_id = ?").contains("g.group_code = ?").contains("i.item_code = ?")
                .contains("g.use_at = 'Y'").contains("i.use_at = 'Y'");
        assertThat(sql("existsLevel", params("tenantId", 1L, "levelId", 3L))).contains("g.group_code = 'LEVEL'")
                .contains("i.common_code_item_id = ?");
    }

    @Test
    void insertWritesCiphertextColumnsAndReturnsTheNewId() {
        String insert = sql("insertEmployee", params("tenantId", 1L));
        assertThat(insert).contains("INSERT INTO tb_user").contains("resident_no_enc", "resident_no_hash", "resident_no_masked",
                "employee_no", "real_user_at", "photo_image", "created_by").contains("'Y'").endsWith("RETURNING user_id");
    }

    @Test
    void updateTouchesResidentNumberAndPhotoOnlyWhenProvided() {
        String keep = sql("updateEmployee", params("tenantId", 1L, "userId", 5L, "residentNoProvided", false, "photoProvided", false));
        String replace = sql("updateEmployee", params("tenantId", 1L, "userId", 5L, "residentNoProvided", true, "photoProvided", true));

        assertThat(keep).doesNotContain("resident_no_enc").doesNotContain("photo_image")
                .contains("login_id = COALESCE(?, login_id)").contains("WHERE user_id = ? AND tenant_id = ?");
        assertThat(replace).contains("resident_no_enc = ?", "resident_no_hash = ?", "resident_no_masked = ?", "photo_image = ?");
        assertThat(keep).doesNotContain("retire_dt = retire_dt").contains("employee_no = ?");
    }

    @Test
    void newAccountsStartWithAnUnsetPasswordChangeTimeAndTheDefaultRole() {
        String account = sql("insertLoginAccount", params("tenantId", 1L));
        assertThat(account).contains("INSERT INTO tb_login_account").contains("password_changed_at, use_at")
                .contains("NULL, 'Y'").endsWith("RETURNING login_id");
        String role = sql("insertDefaultRole", params("tenantId", 1L, "loginId", 2L, "roleCode", "DEFAULT_USER"));
        assertThat(role).contains("INSERT INTO tb_login_account_role (login_id, role_id)").contains("r.tenant_id = ?")
                .contains("r.role_code = ?").contains("r.use_at = 'Y'");
        assertThat(sql("updateLoginProfileImage", params("tenantId", 1L, "loginId", 2L)))
                .contains("UPDATE tb_login_account SET profile_image = ?").contains("tenant_id = ?");
    }
}
