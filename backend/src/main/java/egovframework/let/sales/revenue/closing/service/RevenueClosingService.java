package egovframework.let.sales.revenue.closing.service;

import java.util.List;
import java.util.Map;

import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseRequestVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCustomerSummaryVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingSearchVO;

public interface RevenueClosingService {
    RevenueClosingResponseVO search(Long tenantId, String userId, RevenueClosingSearchVO search) throws Exception;

    List<RevenueClosingCustomerSummaryVO> searchCustomers(Long tenantId, String userId, RevenueClosingSearchVO search)
            throws Exception;

    RevenueClosingCloseResponseVO close(Long tenantId, String userId, RevenueClosingCloseRequestVO request)
            throws Exception;
}
