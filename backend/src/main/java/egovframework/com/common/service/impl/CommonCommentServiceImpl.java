package egovframework.com.common.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.CommonCommentService;

@Service("commonCommentService")
public class CommonCommentServiceImpl extends EgovAbstractServiceImpl implements CommonCommentService {

    private final CommonCommentDAO commonCommentDAO;

    @Autowired
    public CommonCommentServiceImpl(CommonCommentDAO commonCommentDAO) {
        this.commonCommentDAO = commonCommentDAO;
    }

    @Override
    public List<CommonCommentVO> listComments(Long tenantId, String ownerType, Long ownerId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 대상 정보가 올바르지 않습니다.");
        }

        if (commonCommentDAO == null) {
            return new ArrayList<>();
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        List<CommonCommentVO> comments = commonCommentDAO.selectCommonCommentList(params);
        return comments == null ? new ArrayList<>() : comments;
    }

    @Override
    @Transactional
    public CommonCommentVO createComment(Long tenantId, String ownerType, Long ownerId, String content, String writerId, String writerName, Long parentCommentId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 정보가 올바르지 않습니다.");
        }

        String normalizedContent = content.trim();
        if (!StringUtils.hasText(normalizedContent)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해 주세요.");
        }

        CommonCommentVO created = new CommonCommentVO();
        created.setTenantId(tenantId);
        created.setOwnerType(ownerType.trim().toUpperCase());
        created.setOwnerId(ownerId);
        created.setParentCommentId(parentCommentId);
        created.setContent(normalizedContent);
        created.setWriterId(writerId);
        created.setWriterName(writerName);
        created.setDeletedYn("N");

        if (commonCommentDAO != null) {
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("ownerType", created.getOwnerType());
            params.put("ownerId", ownerId);
            params.put("parentCommentId", parentCommentId);
            params.put("content", normalizedContent);
            params.put("writerId", writerId);
            params.put("writerName", writerName);
            params.put("deletedYn", "N");
            Long commentId = commonCommentDAO.insertCommonComment(params);
            if (commentId != null) {
                created.setCommentId(commentId);
                HashMap<String, Object> lookup = new HashMap<>();
                lookup.put("tenantId", tenantId);
                lookup.put("commentId", commentId);
                return commonCommentDAO.selectCommonCommentById(lookup);
            }
        }

        created.setCommentId(1L);
        return created;
    }

    @Override
    @Transactional
    public CommonCommentVO updateComment(Long tenantId, Long commentId, String content, String actorId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (commentId == null || !StringUtils.hasText(content)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 수정 정보가 올바르지 않습니다.");
        }

        CommonCommentVO updated = new CommonCommentVO();
        updated.setCommentId(commentId);
        updated.setTenantId(tenantId);
        updated.setContent(content.trim());
        updated.setWriterId(actorId);
        updated.setDeletedYn("N");

        if (commonCommentDAO != null) {
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("commentId", commentId);
            params.put("content", content.trim());
            params.put("updatedBy", actorId);
            commonCommentDAO.updateCommonComment(params);
        }

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

        if (commonCommentDAO != null) {
            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("commentId", commentId);
            params.put("deletedBy", actorId);
            commonCommentDAO.softDeleteCommonComment(params);
        }
    }
}
