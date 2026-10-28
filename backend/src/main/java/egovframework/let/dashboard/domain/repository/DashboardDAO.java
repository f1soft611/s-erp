package egovframework.let.dashboard.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.dashboard.domain.model.DashboardOverviewVO;
import egovframework.let.dashboard.domain.model.DashboardSalesVO;

@Repository("dashboardDAO")
public class DashboardDAO extends EgovAbstractMapper {
    public Long selectMyRevisionCount(Map<String, Object> params) {
        return selectOne("DashboardDAO.selectMyRevisionCount", params);
    }

    public List<DashboardOverviewVO.Notice> selectNotices(Map<String, Object> params) {
        return selectList("DashboardDAO.selectNotices", params);
    }

    public DashboardSalesVO selectSalesTotals(Map<String, Object> params) {
        return selectOne("DashboardDAO.selectSalesTotals", params);
    }

    public List<DashboardSalesVO.Trend> selectSalesTrend(Map<String, Object> params) {
        return selectList("DashboardDAO.selectSalesTrend", params);
    }

    public Long selectUpcomingCount(Map<String, Object> params) {
        return selectOne("DashboardDAO.selectUpcomingCount", params);
    }

    public List<DashboardSalesVO.Upcoming> selectUpcomingOrders(Map<String, Object> params) {
        return selectList("DashboardDAO.selectUpcomingOrders", params);
    }
}
