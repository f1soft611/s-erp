package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.impl.CommonCommentServiceImpl;
import egovframework.com.config.EgovConfigAppMapper;

class CommonCommentServiceTest {

    @Test
    void createCommentRejectsBlankContent() {
        CommonCommentService service = new CommonCommentServiceImpl(new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return null;
            }
        });

        assertThatThrownBy(() -> service.createComment(1L, "APPROVAL", 10L, "   ", "user-001", "홍길동", null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("댓글");
    }

    @Test
    void createCommentNormalizesOwnerAndWriter() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return 42L;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO vo = new CommonCommentVO();
                vo.setCommentId(42L);
                vo.setTenantId(((Number) params.get("tenantId")).longValue());
                vo.setOwnerType("APPROVAL");
                vo.setOwnerId(10L);
                vo.setContent("테스트 댓글");
                vo.setWriterId("user-001");
                vo.setWriterName("홍길동");
                vo.setDeletedYn("N");
                return vo;
            }
        };

        CommonCommentServiceImpl service = new CommonCommentServiceImpl(stubDao);
        CommonCommentVO created = service.createComment(1L, "approval", 10L, "테스트 댓글", "user-001", "홍길동", null);

        assertThat(created.getTenantId()).isEqualTo(1L);
        assertThat(created.getOwnerType()).isEqualTo("APPROVAL");
        assertThat(created.getOwnerId()).isEqualTo(10L);
        assertThat(created.getContent()).isEqualTo("테스트 댓글");
        assertThat(created.getWriterId()).isEqualTo("user-001");
    }

    @Test
    void createCommentRejectsParentFromAnotherOwner() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO parent = comment(99L);
                parent.setTenantId(1L);
                parent.setOwnerType("NOTICE");
                parent.setOwnerId(11L);
                parent.setDeletedYn("N");
                return parent;
            }
        };

        CommonCommentService service = new CommonCommentServiceImpl(stubDao);

        assertThatThrownBy(() -> service.createComment(1L, "NOTICE", 10L, "답글", "user-001", "홍길동", 99L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("상위 댓글");
    }

    @Test
    void createCommentFailsClearlyWhenDaoIsUnavailable() {
        CommonCommentService service = new CommonCommentServiceImpl(null);

        assertThatThrownBy(() -> service.createComment(1L, "NOTICE", 10L, "댓글", "user-001", "홍길동", null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("DAO");
    }

    @Test
    void createCommentTrimsPersistedContent() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                assertThat(params.get("content")).isEqualTo("댓글");
                return 43L;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO persisted = comment(43L);
                persisted.setContent("댓글");
                return persisted;
            }
        };

        CommonCommentVO created = new CommonCommentServiceImpl(stubDao)
            .createComment(1L, "NOTICE", 10L, "  댓글  ", "user-001", "홍길동", null);

        assertThat(created.getContent()).isEqualTo("댓글");
    }

    @Test
    void createCommentRejectsSelfParentWhenGeneratedIdMatchesParent() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO parent = comment(43L);
                parent.setTenantId(1L);
                parent.setOwnerType("NOTICE");
                parent.setOwnerId(10L);
                parent.setDeletedYn("N");
                return parent;
            }

            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return 43L;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .createComment(1L, "NOTICE", 10L, "답글", "user-001", "홍길동", 43L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("자기 자신");
    }

    @Test
    void updateCommentRequiresActorOwnershipAndReturnsPersistedRow() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int updateCommonComment(Map<String, Object> params) {
                assertThat(params.get("actorId")).isEqualTo("user-001");
                assertThat(params.get("content")).isEqualTo("수정 댓글");
                return 1;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO persisted = comment(7L);
                persisted.setContent("수정 댓글");
                persisted.setWriterId("user-001");
                return persisted;
            }
        };

        CommonCommentVO updated = new CommonCommentServiceImpl(stubDao)
            .updateComment(1L, 7L, "  수정 댓글  ", "user-001");

        assertThat(updated.getContent()).isEqualTo("수정 댓글");
        assertThat(updated.getWriterId()).isEqualTo("user-001");
    }

    @Test
    void updateCommentRejectsWhenNoOwnedRowWasUpdated() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int updateCommonComment(Map<String, Object> params) {
                return 0;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .updateComment(1L, 7L, "수정 댓글", "other-user"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("찾을 수 없습니다");
    }

    @Test
    void deleteCommentRejectsWhenNoOwnedRowWasDeleted() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int softDeleteCommonComment(Map<String, Object> params) {
                assertThat(params.get("actorId")).isEqualTo("other-user");
                return 0;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .deleteComment(1L, 7L, "other-user"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("찾을 수 없습니다");
    }

    @Test
    void listCommentsUsesInjectedDaoResult() throws Exception {
        CommonCommentVO existing = new CommonCommentVO();
        existing.setCommentId(7L);
        existing.setTenantId(1L);
        existing.setOwnerType("NOTICE");
        existing.setOwnerId(10L);
        existing.setContent("공지 댓글");
        existing.setWriterId("user-001");
        existing.setWriterName("홍길동");
        existing.setDeletedYn("N");

        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentList(Map<String, Object> params) {
                return Collections.singletonList(existing);
            }
        };

        CommonCommentServiceImpl service = new CommonCommentServiceImpl(stubDao);
        List<CommonCommentVO> comments = service.listComments(1L, "notice", 10L);

        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).getContent()).isEqualTo("공지 댓글");
    }

    @Test
    void listCommentsPageReturnsRecentCommentsAndCursorMetadata() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                assertThat(params.get("tenantId")).isEqualTo(1L);
                assertThat(params.get("ownerType")).isEqualTo("NOTICE");
                assertThat(params.get("beforeCommentId")).isEqualTo(20L);
                assertThat(params.get("limit")).isEqualTo(4);
                return Arrays.asList(comment(20L), comment(19L), comment(18L), comment(17L));
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "notice", 10L, 3, 20L);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(18L, 19L, 20L);
        assertThat(page.isHasPrevious()).isTrue();
        assertThat(page.getNextBeforeCommentId()).isEqualTo(18L);
    }

    @Test
    void listCommentsPageKeepsRepliesWithSelectedRootComments() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                assertThat(params.get("limit")).isEqualTo(2);
                return Arrays.asList(
                    comment(10L, null),
                    comment(11L, 10L),
                    comment(9L, null)
                );
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "notice", 10L, 1, null);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(10L, 11L);
        assertThat(page.getComments().get(1).getParentCommentId()).isEqualTo(10L);
        assertThat(page.isHasPrevious()).isTrue();
        assertThat(page.getNextBeforeCommentId()).isEqualTo(10L);
    }

    @Test
    void listCommentsPageMarksDeletedParentsAsTombstones() throws Exception {
        CommonCommentVO deletedParent = comment(10L, null);
        deletedParent.setDeletedYn("Y");
        CommonCommentVO reply = comment(11L, 10L);
        reply.setDeletedYn("N");

        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                return Arrays.asList(deletedParent, reply);
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "NOTICE", 10L, 3, null);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(10L, 11L);
        assertThat(page.getComments().get(0).getContent()).isEqualTo("[삭제된 댓글입니다.]");
        assertThat(page.getComments().get(0).getWriterName()).isEqualTo("삭제된 댓글");
        assertThat(page.getComments().get(1).getParentCommentId()).isEqualTo(10L);
    }

    @Test
    void countCommentsUsesSeparateDaoCount() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long countCommonComments(Map<String, Object> params) {
                assertThat(params.get("ownerType")).isEqualTo("NOTICE");
                return 11L;
            }
        };

        long count = new CommonCommentServiceImpl(stubDao).countComments(1L, "notice", 10L);

        assertThat(count).isEqualTo(11L);
    }

    @Test
        void commentMapperKeepsDeletedAncestorsInTheCommentTreeAndCountsOnlyActiveComments()
            throws IOException {
        String mapperXml;
        try (InputStream mapper = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml")) {
            assertThat(mapper).isNotNull();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = mapper.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            mapperXml = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        }

        int countStart = mapperXml.indexOf("<select id=\"countCommonComments\"");
        String countQuery = mapperXml.substring(countStart,
                mapperXml.indexOf("</select>", countStart));

        int pageStart = mapperXml.indexOf("<select id=\"selectCommonCommentPage\"");
        String pageQuery = mapperXml.substring(pageStart,
            mapperXml.indexOf("</select>", pageStart));

        assertThat(pageQuery).contains("all_comment_tree");
        assertThat(pageQuery).contains("HAVING BOOL_OR(deleted_yn = 'N')");
        assertThat(pageQuery).contains("JOIN comment_tree tree ON tree.comment_id = child.parent_comment_id");
        assertThat(pageQuery).contains("root_comment_id");
        assertThat(countQuery).contains("deleted_yn = 'N'");
        assertThat(countQuery).doesNotContain("WITH RECURSIVE root_page AS");
        assertThat(countQuery).contains("COUNT(*)");
        int insertStart = mapperXml.indexOf("<select id=\"insertCommonComment\"");
        String insertQuery = mapperXml.substring(insertStart,
            mapperXml.indexOf("</select>", insertStart));
        assertThat(insertQuery).contains("#{parentCommentId, jdbcType=BIGINT}");
    }

    private static CommonCommentVO comment(Long commentId) {
        return comment(commentId, null);
    }

    private static CommonCommentVO comment(Long commentId, Long parentCommentId) {
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(commentId);
        comment.setParentCommentId(parentCommentId);
        return comment;
    }

    @Test
    void mapperFactoryRegistersSharedCommonSqlResources() throws Exception {
        EgovConfigAppMapper config = new EgovConfigAppMapper();
        Field dbTypeField = EgovConfigAppMapper.class.getDeclaredField("dbType");
        dbTypeField.setAccessible(true);
        dbTypeField.set(config, "postgresql");

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl("jdbc:postgresql://localhost:5432/postgres");
        dataSource.setUsername("postgres");
        dataSource.setPassword("postgres");

        Field dataSourceField = EgovConfigAppMapper.class.getDeclaredField("dataSource");
        dataSourceField.setAccessible(true);
        dataSourceField.set(config, dataSource);

        SqlSessionFactoryBean factoryBean = config.sqlSession();
        SqlSessionFactory factory = factoryBean.getObject();

        assertThat(factory.getConfiguration().getMappedStatementNames())
            .contains("CommonCommentDAO.insertCommonComment")
            .contains("CommonCommentDAO.selectCommonCommentList")
            .contains("CommonCommentDAO.selectCommonCommentPage")
            .contains("CommonCommentDAO.countCommonComments");
    }
}
