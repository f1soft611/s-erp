package egovframework.com.common.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.com.common.domain.model.CommonCommentVO;

@Repository("commonCommentDAO")
public class CommonCommentDAO extends EgovAbstractMapper {

    public List<CommonCommentVO> selectCommonCommentList(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentList", params);
    }

    public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) throws Exception {
        return selectList("CommonCommentDAO.selectCommonCommentPage", params);
    }

    public Long countCommonComments(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.countCommonComments", params);
    }

    public CommonCommentVO selectCommonCommentById(Map<String, Object> params) throws Exception {
        return (CommonCommentVO) selectOne("CommonCommentDAO.selectCommonCommentById", params);
    }

    public Long insertCommonComment(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.insertCommonComment", params);
    }

    public int updateCommonComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.updateCommonComment", params);
    }

    public int softDeleteCommonComment(Map<String, Object> params) throws Exception {
        return update("CommonCommentDAO.softDeleteCommonComment", params);
    }
}
