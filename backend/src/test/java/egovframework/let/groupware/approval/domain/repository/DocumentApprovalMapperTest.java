package egovframework.let.groupware.approval.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.io.Resources;
import org.junit.jupiter.api.Test;

class DocumentApprovalMapperTest {

    @Test
    void nullableDraftingCategoryUsesBigIntForCreateAndUpdate() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("draftingWorkCategoryId", null);
        BoundSql insertSql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertDocumentApprovalMain")
                .getBoundSql(params);
        BoundSql updateSql = configuration
                .getMappedStatement("DocumentApprovalDAO.updateDocumentApprovalMain")
                .getBoundSql(params);

        assertDraftingCategoryJdbcType(insertSql);
        assertDraftingCategoryJdbcType(updateSql);
    }

    @Test
    void approvalAndCommonMappersParseAndKeepGenericFileAccessOutsideApproval() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/com/common/CommonFile_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.insertDocumentApprovalMain")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.insertDocumentApprovalLine")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.insertSystemComment")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("fileId", 77L);
        String downloadSql = configuration
                .getMappedStatement("CommonFileDAO.selectCommonFileByIdExcludingApproval")
                .getBoundSql(params).getSql();
        String deleteSql = configuration
                .getMappedStatement("CommonFileDAO.softDeleteCommonFileExcludingApproval")
                .getBoundSql(params).getSql();
        assertThat(downloadSql).contains("COALESCE(UPPER(owner_type), '') <> 'APPROVAL'");
        assertThat(deleteSql).contains("COALESCE(UPPER(owner_type), '') <> 'APPROVAL'");
    }

    private void parseMapper(Configuration configuration, String resourcePath) throws Exception {
        try (InputStream input = Resources.getResourceAsStream(resourcePath)) {
            new XMLMapperBuilder(input, configuration, resourcePath, configuration.getSqlFragments()).parse();
        }
    }

    private void assertDraftingCategoryJdbcType(BoundSql boundSql) {
        ParameterMapping mapping = boundSql.getParameterMappings().stream()
                .filter(parameter -> "draftingWorkCategoryId".equals(parameter.getProperty()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("draftingWorkCategoryId mapping is missing"));

        assertThat(mapping.getJdbcType()).isEqualTo(JdbcType.BIGINT);
    }
}
