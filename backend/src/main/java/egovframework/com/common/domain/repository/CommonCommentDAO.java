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

    public CommonCommentVO selectCommonCommentById(Map<String, Object> params) throws Exception {
        return (CommonCommentVO) selectOne("CommonCommentDAO.selectCommonCommentById", params);
    }

    public Long insertCommonComment(Map<String, Object> params) throws Exception {
        return (Long) selectOne("CommonCommentDAO.insertCommonComment", params);
    }

    public void updateCommonComment(Map<String, Object> params) throws Exception {
        update("CommonCommentDAO.updateCommonComment", params);
    }

    public void softDeleteCommonComment(Map<String, Object> params) throws Exception {
        update("CommonCommentDAO.softDeleteCommonComment", params);
    }
}
