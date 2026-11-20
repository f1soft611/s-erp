package egovframework.let.hr.order.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.hr.order.domain.model.HrOrderHistoryVO;

@Repository("hrOrderDAO")
public class HrOrderDAO extends EgovAbstractMapper {

    /** 명령 헤더를 추가하고 생성된 order_id를 돌려준다. */
    public Long insertOrderHd(Map<String, Object> params) throws Exception {
        return selectOne("HrOrderDAO.insertOrderHd", params);
    }

    public int insertOrderDt(Map<String, Object> params) throws Exception {
        return insert("HrOrderDAO.insertOrderDt", params);
    }

    public List<HrOrderHistoryVO> selectHistory(Map<String, Object> params) throws Exception {
        return selectList("HrOrderDAO.selectHistory", params);
    }
}
