package egovframework.let.sales.statement.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

@Repository("salesStatementDAO")
public class SalesStatementDAO extends EgovAbstractMapper {
    public Long lockDelivery(Map<String, Object> params) throws Exception {
        return selectOne("SalesStatementDAO.lockDelivery", params);
    }

    public boolean existsActive(Map<String, Object> params) throws Exception {
        return Boolean.TRUE.equals(selectOne("SalesStatementDAO.existsActive", params));
    }

    public Long insertHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesStatementDAO.insertHeader", params);
    }

    public int insertDetails(Map<String, Object> params) throws Exception {
        return insert("SalesStatementDAO.insertDetails", params);
    }

    public Map<String, Object> selectHeader(Map<String, Object> params) throws Exception {
        return selectOne("SalesStatementDAO.selectHeader", params);
    }

    public List<Map<String, Object>> selectDetails(Map<String, Object> params) throws Exception {
        return selectList("SalesStatementDAO.selectDetails", params);
    }

    public List<Map<String, Object>> selectSources(Map<String, Object> params) throws Exception {
        return selectList("SalesStatementDAO.selectSources", params);
    }

    public List<Map<String, Object>> selectStatus(Map<String, Object> params) throws Exception {
        return selectList("SalesStatementDAO.selectStatus", params);
    }

    public int updateHeader(Map<String, Object> params) throws Exception {
        return update("SalesStatementDAO.updateHeader", params);
    }

    public int deleteHeader(Map<String, Object> params) throws Exception {
        return update("SalesStatementDAO.deleteHeader", params);
    }
}
