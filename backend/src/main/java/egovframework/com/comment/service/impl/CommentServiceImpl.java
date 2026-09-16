package egovframework.com.comment.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.comment.domain.model.CommentVO;
import egovframework.com.comment.service.CommentService;

@Service("commentService")
public class CommentServiceImpl extends EgovAbstractServiceImpl implements CommentService {

    @Override
    public List<CommentVO> listComments(Long tenantId, String targetType, Long targetId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(targetType) || targetId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 대상 정보가 올바르지 않습니다.");
        }
        return new ArrayList<>();
    }

    @Override
    @Transactional
    public CommentVO createComment(Long tenantId, String targetType, Long targetId, String content, String writerId, String writerName) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(targetType) || targetId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }

        CommentVO created = new CommentVO();
        created.setCommentId(1L);
        created.setTenantId(tenantId);
        created.setTargetType(targetType);
        created.setTargetId(targetId);
        created.setContent(content.trim());
        created.setWriterId(writerId);
        created.setWriterName(writerName);
        created.setDeletedYn("N");
        return created;
    }

    @Override
    @Transactional
    public CommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (commentId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 수정 정보가 올바르지 않습니다.");
        }

        CommentVO updated = new CommentVO();
        updated.setCommentId(commentId);
        updated.setTenantId(tenantId);
        updated.setContent(content.trim());
        updated.setWriterId(actorId);
        updated.setDeletedYn("N");
        return updated;
    }

    @Override
    @Transactional
    public void deleteComment(Long tenantId, Long commentId, String actorId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (commentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 ID가 없습니다.");
        }
    }
}
