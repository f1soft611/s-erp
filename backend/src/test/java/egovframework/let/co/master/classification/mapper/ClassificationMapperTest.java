package egovframework.let.co.master.classification.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Collections;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import egovframework.let.co.master.classification.domain.model.ClassificationKind;

class ClassificationMapperTest {
    private Configuration configuration;

    @BeforeEach
    void parseMapper() throws Exception {
        String resource = "egovframework/mapper/let/co/master/classification/Classification_SQL_postgresql.xml";
        configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(stream, configuration, resource, configuration.getSqlFragments()).parse();
        }
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void readsAndUpdatesAlwaysScopeTenantAndUseFixedTables(ClassificationKind kind) {
        String domain = domain(kind);
        for (String operation : new String[] {"selectList", "selectById", "selectForUpdate", "countActiveChildren", "update"}) {
            BoundSql bound = statement(kind, operation).getBoundSql(Collections.emptyMap());
            assertThat(sql(bound)).contains("tb_cls_" + domain, "WHERE tenant_id = ?");
            assertThat(bound.getParameterMappings()).anyMatch(parameter -> "tenantId".equals(parameter.getProperty()));
            if (!"selectList".equals(operation)) {
                assertThat(sql(bound)).contains(("countActiveChildren".equals(operation) ? "upper_" : "")
                        + domain + "_cls_id = ?");
            }
        }
        assertThat(sql(statement(kind, "countActiveChildren").getBoundSql(Collections.emptyMap())))
                .contains("use_at = 'Y'");
        assertThat(sql(statement(kind, "selectList").getBoundSql(Collections.emptyMap())))
                .contains("ORDER BY upper_" + domain + "_cls_id NULLS FIRST, sort_seq, " + domain + "_cls_id");
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void lockingReadsCannotBeServedFromMyBatisCache(ClassificationKind kind) {
        MappedStatement statement = statement(kind, "selectForUpdate");
        assertThat(sql(statement.getBoundSql(Collections.emptyMap()))).endsWith("FOR UPDATE");
        assertThat(statement.isUseCache()).isFalse();
        assertThat(statement.isFlushCacheRequired()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(ClassificationKind.class)
    void insertReturnsIdAndBindsTenantAndActorWhileUpdatePreservesHierarchy(ClassificationKind kind) {
        MappedStatement insert = statement(kind, "insert");
        BoundSql insertSql = insert.getBoundSql(Collections.emptyMap());
        assertThat(sql(insertSql)).contains("INSERT INTO tb_cls_" + domain(kind),
                "tenant_id,", "created_by, created_at", "CURRENT_TIMESTAMP", "RETURNING " + domain(kind) + "_cls_id");
        assertThat(insertSql.getParameterMappings()).extracting(parameter -> parameter.getProperty())
                .containsExactly("tenantId", "name", "level", "parentId", "sortSeq", "useAt", "actorId");
        assertThat(insertSql.getParameterMappings().get(3).getJdbcType().name()).isEqualTo("BIGINT");
        assertThat(insert.isFlushCacheRequired()).isTrue();
        assertThat(insert.isUseCache()).isFalse();

        BoundSql updateSql = statement(kind, "update").getBoundSql(Collections.emptyMap());
        assertThat(sql(updateSql)).contains("updated_by = ?", "updated_at = CURRENT_TIMESTAMP")
                .doesNotContain("upper_", "_cls_lvl", "created_by", "created_at");
        assertThat(updateSql.getParameterMappings()).extracting(parameter -> parameter.getProperty())
                .containsExactly("name", "sortSeq", "useAt", "actorId", "tenantId", "id");
    }

    private MappedStatement statement(ClassificationKind kind, String operation) {
        return configuration.getMappedStatement("ClassificationDAO." + kind.getStatementPrefix() + "_" + operation);
    }

    private String domain(ClassificationKind kind) {
        return kind == ClassificationKind.ITEM ? "item" : "partner";
    }

    private String sql(BoundSql boundSql) {
        return boundSql.getSql().replaceAll("\\s+", " ").trim();
    }
}
