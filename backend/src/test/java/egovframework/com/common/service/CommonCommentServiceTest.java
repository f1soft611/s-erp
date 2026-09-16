package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.service.impl.CommonCommentServiceImpl;

class CommonCommentServiceTest {

    private final CommonCommentService service = new CommonCommentServiceImpl();

    @Test
    void createCommentRejectsBlankContent() {
        assertThatThrownBy(() -> service.createComment(1L, "APPROVAL", 10L, "   ", "user-001", "홍길동", null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("댓글");
    }

    @Test
    void createCommentNormalizesOwnerAndWriter() throws Exception {
        CommonCommentVO created = service.createComment(1L, "approval", 10L, "테스트 댓글", "user-001", "홍길동", null);

        assertThat(created.getTenantId()).isEqualTo(1L);
        assertThat(created.getOwnerType()).isEqualTo("APPROVAL");
        assertThat(created.getOwnerId()).isEqualTo(10L);
        assertThat(created.getContent()).isEqualTo("테스트 댓글");
        assertThat(created.getWriterId()).isEqualTo("user-001");
    }
}
