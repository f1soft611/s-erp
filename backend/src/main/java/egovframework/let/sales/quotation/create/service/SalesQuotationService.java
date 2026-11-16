package egovframework.let.sales.quotation.create.service;

import java.util.List;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationCreateRequestVO;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationVO;

public interface SalesQuotationService {
    SalesQuotationVO createQuotation(Long tenantId, String userId, SalesQuotationCreateRequestVO request) throws Exception;
    SalesQuotationVO getQuotation(Long tenantId, String userId, Long quotationId) throws Exception;
    SalesQuotationVO updateQuotation(Long tenantId, String userId, Long quotationId, SalesQuotationCreateRequestVO request) throws Exception;
    void deleteQuotation(Long tenantId, String userId, Long quotationId) throws Exception;
    List<SalesQuotationVO> options(Long tenantId, String userId, Long customerId, String keyword) throws Exception;
}
