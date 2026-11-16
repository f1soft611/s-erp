package egovframework.let.sales.quotation.status.service;

import java.util.List;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusSearchVO;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusVO;

public interface SalesQuotationStatusService {
    List<SalesQuotationStatusVO> search(Long tenantId, SalesQuotationStatusSearchVO search);
}
