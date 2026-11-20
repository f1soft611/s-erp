package egovframework.let.hr.employee.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EmployeePickerMapperTest {

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

    private String sql(Map<String, Object> params) {
        return configuration.getMappedStatement("EmployeeDAO.selectPickerEmployees").getBoundSql(params)
                .getSql().replaceAll("\\s+", " ").trim();
    }

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    @Test
    void isTenantScopedAndExcludesInactiveAndRetiredEmployees() {
        String sql = sql(params("tenantId", 1L));

        assertThat(sql).contains("u.tenant_id = ?").contains("u.use_at = 'Y'")
                .contains("NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)");
    }

    @Test
    void aDepartmentMeansDirectMembersOnlyAndNoDepartmentMeansEveryone() {
        assertThat(sql(params("tenantId", 1L, "departmentId", 7L))).contains("AND u.department_id = ?");
        assertThat(sql(params("tenantId", 1L))).doesNotContain("u.department_id = ?");
    }

    @Test
    void theKeywordSearchesNamePositionEmployeeNumberAndDepartment() {
        String sql = sql(params("tenantId", 1L, "keyword", "홍"));

        assertThat(sql).contains("u.user_nm ILIKE", "u.employee_no ILIKE", "pi.item_nm ILIKE", "d.department_nm ILIKE");
        assertThat(sql(params("tenantId", 1L))).doesNotContain("ILIKE");
    }

    @Test
    void returnsOnlyTheFieldsTheDialogNeedsAndNothingPersonal() {
        String sql = sql(params("tenantId", 1L));

        assertThat(sql).contains("u.user_id", "u.employee_no", "u.user_nm", "u.department_id", "d.department_nm",
                "u.position_code", "pi.item_nm AS positionNm", "u.photo_image");
        assertThat(sql).doesNotContain("mobile_no").doesNotContain("home_phone_no").doesNotContain("email_addr")
                .doesNotContain("address").doesNotContain("resident_no").doesNotContain("birth_dt")
                .doesNotContain("login_code");
    }
}
