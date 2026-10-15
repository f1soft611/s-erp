package egovframework.let.groupware.community.notice.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.io.Resources;
import org.junit.jupiter.api.Test;

class NoticeBoardTenantScopeMapperTest {

    private static final String MAPPER_RESOURCE =
            "egovframework/mapper/let/groupware/community/notice/NoticeBoard_SQL_postgresql.xml";

    @Test
    void postReadsAndInsertAreTenantAndBoardTypeScoped() throws Exception {
        Configuration configuration = parseMapper();
        Map<String, Object> params = noticeParams();

        BoundSql list = sql(configuration, "selectNoticePostList", params);
        BoundSql count = sql(configuration, "selectNoticePostCount", params);
        BoundSql detail = sql(configuration, "selectNoticePostById", params);
        BoundSql insert = sql(configuration, "insertNoticePost", params);

        assertThat(list.getSql()).contains("p.tenant_id = ?", "p.board_type_code = ?");
        assertThat(count.getSql()).contains("p.tenant_id = ?", "p.board_type_code = ?");
        assertThat(detail.getSql())
                .contains("p.tenant_id = ?", "p.post_id = ?", "p.board_type_code = ?");
        assertThat(insert.getSql())
                .contains("tenant_id", "category_code")
                .doesNotContain("notice_gubun_code");
        assertThat(parameterProperties(insert)).contains("tenantId", "noticeGubunCode");
    }

    @Test
    void postMutationsAreScopedByTenantPostAndBoardType() throws Exception {
        Configuration configuration = parseMapper();
        Map<String, Object> params = noticeParams();

        for (String statement : new String[] {
                "updateNoticePost", "updateNoticePostPinned", "softDeleteNoticePost",
                "incrementNoticePostViewCount"
        }) {
            String sql = sql(configuration, statement, params).getSql();
            assertThat(sql).as(statement)
                    .contains("tenant_id = ?", "post_id = ?", "board_type_code = ?");
        }

        String history = sql(configuration, "insertNoticePostViewHistory", params).getSql();
        assertThat(history).contains("INSERT INTO tb_board_post_view_history", "tenant_id");
        assertThat(parameterProperties(sql(configuration, "insertNoticePostViewHistory", params)))
                .contains("tenantId");
    }

    private Configuration parseMapper() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(MAPPER_RESOURCE)) {
            new XMLMapperBuilder(input, configuration, MAPPER_RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private BoundSql sql(Configuration configuration, String statement, Map<String, Object> params) {
        return configuration.getMappedStatement("NoticeBoardDAO." + statement).getBoundSql(params);
    }

    private Map<String, Object> noticeParams() {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("boardTypeCode", "NOTICE");
        params.put("postId", 13L);
        params.put("noticeGubunCode", "GENERAL");
        params.put("categoryCode", "GENERAL");
        params.put("recordCountPerPage", 20);
        params.put("firstIndex", 0);
        return params;
    }

    private java.util.List<String> parameterProperties(BoundSql sql) {
        return sql.getParameterMappings().stream()
                .map(mapping -> mapping.getProperty())
                .collect(java.util.stream.Collectors.toList());
    }
}
