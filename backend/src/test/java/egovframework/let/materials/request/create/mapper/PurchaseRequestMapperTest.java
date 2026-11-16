package egovframework.let.materials.request.create.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class PurchaseRequestMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/materials/request/create/EgovPurchaseRequestCreate_SQL_postgresql.xml";

    @Test
    void readAndChangeStatementsAreTenantScoped() throws Exception {
        Configuration configuration = parse();
        for (String id : Arrays.asList(
                "selectRequest", "selectRequestForUpdate", "selectRequestDetails",
                "updateRequestHeader", "softDeleteRequestHeader", "shiftDetailLineNos")) {
            BoundSql sql = sql(configuration, id);
            assertThat(normalize(sql.getSql())).as(id).contains("tenant_id = ?");
            assertThat(properties(sql)).as(id).contains("tenantId", "purchaseRequestId");
        }
        for (String id : Arrays.asList(
                "selectRequest", "selectRequestForUpdate", "updateRequestHeader", "softDeleteRequestHeader")) {
            assertThat(normalize(sql(configuration, id).getSql())).as(id).contains("use_at = 'Y'");
        }
        for (String id : Arrays.asList("updateRequestDetail", "deleteRequestDetail")) {
            BoundSql sql = sql(configuration, id);
            assertThat(normalize(sql.getSql())).as(id).contains("tenant_id = ?");
            assertThat(properties(sql)).as(id).contains("tenantId", "purchaseRequestId", "purchaseRequestDetailId");
        }
    }

    @Test
    void referenceChecksBindTenantAndCommonCodeGroup() throws Exception {
        Configuration configuration = parse();
        assertThat(properties(sql(configuration, "selectMaterialTypeCode"))).contains("tenantId", "id");
        assertThat(normalize(sql(configuration, "selectMaterialTypeCode").getSql()))
                .contains("material_type_code", "delete_status = 'N'", "deleted_at IS NULL");
        String useType = normalize(sql(configuration, "existsUseType").getSql());
        assertThat(useType).contains("tb_common_code_item", "tb_common_code_group",
                "'PURCHASE_USE_TYPE'", "use_at = 'Y'");
        String requester = normalize(sql(configuration, "selectRequester").getSql());
        assertThat(requester).contains("tb_login_account", "tb_user", "login_code = ?");
    }

    @Test
    void insertsAuditColumnsAndCastsDates() throws Exception {
        Configuration configuration = parse();
        String header = normalize(sql(configuration, "insertRequestHeader").getSql());
        assertThat(header).contains("request_no", "requester_id", "request_dept_id", "status",
                "created_by", "CAST(? AS date)", "RETURNING purchase_request_id");
        // 부서 없는 사용자는 request_dept_id가 null이고, 전역 jdbcTypeForNull=VARCHAR라 BIGINT를 명시해야 한다.
        assertThat(sql(configuration, "insertRequestHeader").getParameterMappings().stream()
                .filter(item -> "requestDeptId".equals(item.getProperty()))
                .map(item -> item.getJdbcType()))
                .containsExactly(org.apache.ibatis.type.JdbcType.BIGINT);
        String detail = normalize(sql(configuration, "insertRequestDetail").getSql());
        assertThat(detail).contains("request_qty", "request_delivery_dt", "use_type", "created_by",
                "CAST(? AS date)", "RETURNING purchase_request_detail_id");
        String update = normalize(sql(configuration, "updateRequestDetail").getSql());
        assertThat(update).contains("updated_by = ?", "updated_at = now()", "line_no = ?");
        assertThat(normalize(sql(configuration, "updateRequestHeader").getSql())).doesNotContain("request_no");
        assertThat(normalize(sql(configuration, "softDeleteRequestHeader").getSql())).contains("use_at = 'N'");
        assertThat(normalize(sql(configuration, "selectRequestForUpdate").getSql())).contains("FOR UPDATE");
    }

    @Test
    void loadJoinsNamesForRequesterMaterialAndUseType() throws Exception {
        Configuration configuration = parse();
        String header = normalize(sql(configuration, "selectRequest").getSql());
        assertThat(header).contains("requesterName", "requestDeptName", "createdByName", "updatedByName");
        String details = normalize(sql(configuration, "selectRequestDetails").getSql());
        assertThat(details).contains("material_code", "material_name", "material_spec",
                "useTypeName", "ORDER BY d.line_no");
    }

    private String normalize(String sql) {
        return sql.replaceAll("\\s+", " ");
    }

    private Configuration parse() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private BoundSql sql(Configuration configuration, String id) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 1L);
        params.put("id", 1L);
        params.put("loginCode", "user01");
        params.put("code", "PRODUCTION");
        params.put("purchaseRequestId", 300L);
        params.put("purchaseRequestDetailId", 400L);
        params.put("requestNo", "MR-20261112-0001");
        params.put("requestDt", "2026-11-12");
        params.put("requesterId", 7L);
        params.put("requestDeptId", 3L);
        params.put("status", "REQUESTED");
        params.put("remark", "memo");
        params.put("lineNo", 1);
        params.put("materialId", 101L);
        params.put("requestQty", 10);
        params.put("requestDeliveryDt", "2026-11-20");
        params.put("useType", "PRODUCTION");
        params.put("requestRemark", null);
        params.put("createdBy", "user01");
        params.put("updatedBy", "user02");
        return configuration.getMappedStatement("PurchaseRequestDAO." + id).getBoundSql(params);
    }

    private List<String> properties(BoundSql sql) {
        return sql.getParameterMappings().stream()
                .map(item -> item.getProperty())
                .collect(Collectors.toList());
    }
}
