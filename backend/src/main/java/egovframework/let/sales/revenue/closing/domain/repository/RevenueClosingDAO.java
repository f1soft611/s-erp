package egovframework.let.sales.revenue.closing.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCustomerSummaryVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingDetailVO;

@Repository("revenueClosingDAO")
public class RevenueClosingDAO extends EgovAbstractMapper {
    public List<RevenueClosingDetailVO> selectDetails(Map<String, Object> params) throws Exception {
        return selectList("RevenueClosingDAO.selectDetails", params);
    }

    public List<RevenueClosingCustomerSummaryVO> selectCustomerSummaries(Map<String, Object> params)
            throws Exception {
        return selectList("RevenueClosingDAO.selectCustomerSummaries", params);
    }

    public List<Map<String, Object>> lockDetailsForClosing(Map<String, Object> params) throws Exception {
        return selectList("RevenueClosingDAO.lockDetailsForClosing", params);
    }

    public int markDetailsClosed(Map<String, Object> params) throws Exception {
        return update("RevenueClosingDAO.markDetailsClosed", params);
    }
}
