package egovframework.let.dashboard.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.dashboard.domain.model.DashboardOverviewVO;
import egovframework.let.dashboard.domain.model.DashboardSalesVO;

public interface DashboardService {
    DashboardOverviewVO overview(LoginVO user) throws Exception;
    DashboardSalesVO sales(LoginVO user, String month) throws Exception;
}
