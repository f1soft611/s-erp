package egovframework.com.common.service;

import java.util.List;

import egovframework.com.common.domain.model.CommonCommentVO;

public interface CommonCommentService {
    List<CommonCommentVO> listComments(Long tenantId, String ownerType, Long ownerId) throws Exception;
    CommonCommentVO createComment(Long tenantId, String ownerType, Long ownerId, String content, String writerId, String writerName, Long parentCommentId) throws Exception;
    CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception;
    void deleteComment(Long tenantId, Long commentId, String actorId) throws Exception;
}
