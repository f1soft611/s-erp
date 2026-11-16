package egovframework.let.sales.quotation.status.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.sales.quotation.status.domain.model.SalesQuotationStatusVO;

@Repository
public class SalesQuotationStatusDAO extends EgovAbstractMapper {
    public List<SalesQuotationStatusVO> selectList(Map<String, Object> params) {
        return selectList("SalesQuotationStatusDAO.selectList", params);
    }
}
