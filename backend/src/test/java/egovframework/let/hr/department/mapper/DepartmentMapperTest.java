package egovframework.let.hr.department.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DepartmentMapperTest {

    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/hr/department/Department_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    private String sql(String id, Map<String, Object> params) {
        BoundSql bound = configuration.getMappedStatement("DepartmentDAO." + id).getBoundSql(params);
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
    void listHidesInactiveDepartmentsUnlessRequestedAndKeepsTenantScope() {
        String hidden = sql("selectDepartmentList", params("tenantId", 1L, "includeInactive", false));
        String all = sql("selectDepartmentList", params("tenantId", 1L, "includeInactive", true));

        assertThat(hidden).contains("d.tenant_id = ?").contains("d.use_at = 'Y' ORDER BY d.sort_order");
        assertThat(all).contains("d.tenant_id = ?").doesNotContain("d.use_at = 'Y' ORDER BY");
        assertThat(all).contains("ORDER BY d.sort_order ASC, d.department_nm ASC, d.department_id ASC");
    }

    @Test
    void everyDepartmentStatementIsTenantScoped() {
        Map<String, Object> input = params("tenantId", 1L, "departmentId", 2L, "userId", 3L,
                "parentDepartmentId", null, "departmentNm", "영업", "useAt", "N");
        for (String id : new String[] {"selectDepartmentById", "updateDepartment", "updateDepartmentUse",
                "countSiblingName", "countActiveChildren", "countActiveUsers", "existsActiveMember",
                "selectDepartmentUsers"}) {
            assertThat(sql(id, input)).as(id).contains("tenant_id = ?");
        }
    }

    @Test
    void childAndUserCountsOnlyCountActiveRows() {
        Map<String, Object> input = params("tenantId", 1L, "departmentId", 2L);
        assertThat(sql("countActiveChildren", input)).contains("parent_department_id = ?").contains("use_at = 'Y'");
        assertThat(sql("countActiveUsers", input)).contains("department_id = ?").contains("use_at = 'Y'");
    }

    @Test
    void siblingNameComparisonTreatsNullParentAsRoot() {
        String withoutExclude = sql("countSiblingName",
                params("tenantId", 1L, "parentDepartmentId", null, "departmentNm", "본사"));
        String withExclude = sql("countSiblingName",
                params("tenantId", 1L, "parentDepartmentId", 1L, "departmentNm", "영업", "excludeDepartmentId", 5L));

        assertThat(withoutExclude).contains("parent_department_id IS NOT DISTINCT FROM ?")
                .doesNotContain("department_id != ?");
        assertThat(withExclude).contains("AND department_id != ?");
    }

    @Test
    void insertCreatesActiveDepartmentWithAuditColumnsAndReturnsId() {
        String insert = sql("insertDepartment", params("tenantId", 1L));
        assertThat(insert).contains("INSERT INTO tb_department").contains("manager_user_id", "department_dc",
                "created_by", "updated_by").contains("'Y'").endsWith("RETURNING department_id");
    }

    @Test
    void managerMustBeAnActiveUserOfThatDepartment() {
        String member = sql("existsActiveMember", params("tenantId", 1L, "departmentId", 2L, "userId", 3L));
        assertThat(member).contains("tenant_id = ?").contains("user_id = ?").contains("department_id = ?")
                .contains("use_at = 'Y'");
    }

    @Test
    void companyNameComesFromTheTenantRow() {
        assertThat(sql("selectCompanyName", params("value", 1L)))
                .contains("SELECT tenant_nm FROM tb_tenant WHERE tenant_id = ?");
    }

    @Test
    void unassignedUsersAreActiveUsersWithoutDepartmentInTheTenant() {
        String users = sql("selectUnassignedUsers", params("tenantId", 1L, "status", "ACTIVE"));
        assertThat(users).contains("u.tenant_id = ?").contains("u.department_id IS NULL").contains("u.use_at = 'Y'")
                .contains("'N' AS manager_yn");
    }

    @Test
    void retiredEmployeesAreExcludedFromBlockingAndMembershipChecks() {
        String retired = "NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)";
        assertThat(sql("countActiveUsers", params("tenantId", 1L, "departmentId", 2L))).contains(retired);
        assertThat(sql("existsActiveMember", params("tenantId", 1L, "departmentId", 2L, "userId", 3L))).contains(retired);
        assertThat(sql("selectDepartmentList", params("tenantId", 1L, "includeInactive", true))).contains(retired + ") AS user_count");
    }

    @Test
    void memberListsCarryEmployeeNoPositionAndStatusAndHonorTheStatusFilter() {
        for (String id : new String[] {"selectDepartmentUsers", "selectUnassignedUsers"}) {
            Map<String, Object> input = params("tenantId", 1L, "departmentId", 2L, "status", "RETIRED");
            String retiredOnly = sql(id, input);
            assertThat(retiredOnly).as(id).contains("u.employee_no", "pi.item_nm AS position_nm", "AS employment_status")
                    .contains("AND (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)");
            input.put("status", "ALL");
            assertThat(sql(id, input)).as(id + " ALL").doesNotContain("AND (u.retire_dt IS NOT NULL")
                    .doesNotContain("AND NOT (u.retire_dt IS NOT NULL");
            input.remove("status");
            assertThat(sql(id, input)).as(id + " default").contains("AND NOT (u.retire_dt IS NOT NULL AND u.retire_dt <= CURRENT_DATE)");
        }
    }

    @Test
    void usersListPutsManagerFirstAndOnlyActiveUsers() {
        String users = sql("selectDepartmentUsers", params("tenantId", 1L, "departmentId", 2L));
        assertThat(users).contains("u.use_at = 'Y'")
                .contains("ORDER BY CASE WHEN d.manager_user_id = u.user_id THEN 0 ELSE 1 END");
    }
}
