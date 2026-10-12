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
    void draftWritesDocumentNumberAndCanUpdateRevisionRequestedDocuments() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("eabusNo", "001");
        params.put("documentStatus", "DRAFT");
        BoundSql insertBoundSql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertDocumentApprovalMain")
                .getBoundSql(params);
        BoundSql updateBoundSql = configuration
                .getMappedStatement("DocumentApprovalDAO.updateDocumentApprovalMain")
                .getBoundSql(params);
        String ownerSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDraftDrafterId")
                .getBoundSql(params).getSql();

        assertThat(insertBoundSql.getSql()).contains("eabus_no");
        assertThat(updateBoundSql.getSql())
                .contains("eabus_no = ?")
                .contains("document_status IN ('DRAFT', 'REVISION_REQUESTED')");
        assertThat(insertBoundSql.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("eabusNo");
        assertThat(updateBoundSql.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("eabusNo");
        assertThat(ownerSql).contains("document_status IN ('DRAFT', 'REVISION_REQUESTED')");
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
        assertThat(downloadSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
        assertThat(deleteSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
    }

    @Test
    void approvalWorkflowAndSystemTimelineStatementsAreMapped() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalForUpdate")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.updateDocumentApprovalStatus")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectCurrentPendingApprovalLine")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.updateApprovalLineAction")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectPendingApprovalCountForStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectNextWaitingApprovalStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.activateApprovalStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectRelatedDocumentList")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalSummary")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalDetail")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectApprovalLines")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDraftDocumentStatus")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalSystemEvents")).isTrue();

        String draftResponseSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDraftDocumentStatus")
                .getBoundSql(new HashMap<String, Object>())
                .getSql();
        assertThat(draftResponseSql)
                .contains("eabus_no")
                .contains("document_status")
                .contains("submitted_at")
                .contains("drafter_id = ?");

        String detailSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDocumentApprovalDetail")
                .getBoundSql(new HashMap<String, Object>())
                .getSql();
        assertThat(detailSql).contains("drafting_work_category_id");
    }

    @Test
    void approvalUserCommentPageAndCountStatementsAreMapped() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalUserCommentPage")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.countApprovalUserComments")).isTrue();
    }

    @Test
    void genericCommentMutationAndFileIdAccessExcludeApprovalOwnedRecords() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/com/common/CommonFile_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("commentId", 12L);
        params.put("fileId", 77L);

        String updateCommentSql = configuration
                .getMappedStatement("CommonCommentDAO.updateCommonComment")
                .getBoundSql(params).getSql();
        String deleteCommentSql = configuration
                .getMappedStatement("CommonCommentDAO.softDeleteCommonComment")
                .getBoundSql(params).getSql();
        String downloadFileSql = configuration
                .getMappedStatement("CommonFileDAO.selectCommonFileByIdExcludingApproval")
                .getBoundSql(params).getSql();
        String deleteFileSql = configuration
                .getMappedStatement("CommonFileDAO.softDeleteCommonFileExcludingApproval")
                .getBoundSql(params).getSql();

        assertThat(updateCommentSql).contains("UPPER(owner_type)").contains("'APPROVAL'");
        assertThat(deleteCommentSql).contains("UPPER(owner_type)").contains("'APPROVAL'");
        assertThat(downloadFileSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
        assertThat(deleteFileSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
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
