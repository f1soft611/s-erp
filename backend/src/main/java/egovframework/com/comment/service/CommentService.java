package egovframework.com.comment.service;

import java.util.List;

import egovframework.com.comment.domain.model.CommentVO;

public interface CommentService {
    List<CommentVO> listComments(Long tenantId, String targetType, Long targetId) throws Exception;
    CommentVO createComment(Long tenantId, String targetType, Long targetId, String content, String writerId, String writerName) throws Exception;
    CommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception;
    void deleteComment(Long tenantId, Long commentId, String actorId) throws Exception;
}
