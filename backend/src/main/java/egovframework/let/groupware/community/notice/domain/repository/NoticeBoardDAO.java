package egovframework.let.groupware.community.notice.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;

@Repository("noticeBoardDAO")
public class NoticeBoardDAO extends EgovAbstractMapper {

    public List<NoticeBoardPostVO> selectNoticePostList(Map<String, Object> params) throws Exception {
        return selectList("NoticeBoardDAO.selectNoticePostList", params);
    }

    public NoticeBoardPostVO selectNoticePostById(Map<String, Object> params) throws Exception {
        return (NoticeBoardPostVO) selectOne("NoticeBoardDAO.selectNoticePostById", params);
    }

    public Long insertNoticePost(Map<String, Object> params) throws Exception {
        return (Long) selectOne("NoticeBoardDAO.insertNoticePost", params);
    }

    public void updateNoticePost(Map<String, Object> params) throws Exception {
        update("NoticeBoardDAO.updateNoticePost", params);
    }

    public void softDeleteNoticePost(Map<String, Object> params) throws Exception {
        update("NoticeBoardDAO.softDeleteNoticePost", params);
    }

    public List<NoticeBoardFileVO> selectNoticeAttachmentList(Map<String, Object> params) throws Exception {
        return selectList("NoticeBoardDAO.selectNoticeAttachmentList", params);
    }

    public NoticeBoardFileVO selectNoticeAttachmentById(Map<String, Object> params) throws Exception {
        return (NoticeBoardFileVO) selectOne("NoticeBoardDAO.selectNoticeAttachmentById", params);
    }

    public Long insertNoticeAttachment(Map<String, Object> params) throws Exception {
        return (Long) selectOne("NoticeBoardDAO.insertNoticeAttachment", params);
    }

    public void softDeleteNoticeAttachment(Map<String, Object> params) throws Exception {
        update("NoticeBoardDAO.softDeleteNoticeAttachment", params);
    }
}
