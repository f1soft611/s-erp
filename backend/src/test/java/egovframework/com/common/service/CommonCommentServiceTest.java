package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.impl.CommonCommentServiceImpl;

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
                return List.of(existing);
            }
        };

        CommonCommentServiceImpl service = new CommonCommentServiceImpl(stubDao);
        List<CommonCommentVO> comments = service.listComments(1L, "notice", 10L);

        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).getContent()).isEqualTo("공지 댓글");
    }
}
