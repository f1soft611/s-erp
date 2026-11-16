package egovframework.let.sales.quotation.create.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationVO;
import egovframework.let.sales.quotation.create.domain.model.SalesQuotationDetailVO;

@Repository
public class SalesQuotationDAO extends EgovAbstractMapper {
    public boolean existsCustomer(Map<String, Object> p) { return Boolean.TRUE.equals(selectOne("SalesQuotationDAO.existsCustomer", p)); }
    public boolean existsMaterial(Map<String, Object> p) { return Boolean.TRUE.equals(selectOne("SalesQuotationDAO.existsMaterial", p)); }
    public Long insertHeader(Map<String, Object> p) { return selectOne("SalesQuotationDAO.insertHeader", p); }
    public Long insertDetail(Map<String, Object> p) { return selectOne("SalesQuotationDAO.insertDetail", p); }
    public SalesQuotationVO selectHeader(Map<String, Object> p) { return selectOne("SalesQuotationDAO.selectHeader", p); }
    public SalesQuotationVO selectForUpdate(Map<String, Object> p) { return selectOne("SalesQuotationDAO.selectForUpdate", p); }
    public List<SalesQuotationDetailVO> selectDetails(Map<String, Object> p) { return selectList("SalesQuotationDAO.selectDetails", p); }
    public int updateHeader(Map<String, Object> p) { return update("SalesQuotationDAO.updateHeader", p); }
    public int deleteDetails(Map<String, Object> p) { return delete("SalesQuotationDAO.deleteDetails", p); }
    public int softDelete(Map<String, Object> p) { return update("SalesQuotationDAO.softDelete", p); }
    public List<SalesQuotationVO> selectOptions(Map<String, Object> p) { return selectList("SalesQuotationDAO.selectOptions", p); }
}
