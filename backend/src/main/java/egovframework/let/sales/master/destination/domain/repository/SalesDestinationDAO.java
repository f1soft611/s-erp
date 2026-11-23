package egovframework.let.sales.master.destination.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationCustomerVO;

@Repository("salesDestinationDAO")
public class SalesDestinationDAO extends EgovAbstractMapper {
    public boolean customerExists(Map<String, Object> params) {
        return Boolean.TRUE.equals(selectOne("SalesDestinationDAO.customerExists", params));
    }

    public List<SalesDestinationCustomerVO> customers(Map<String, Object> params) {
        return selectList("SalesDestinationDAO.customers", params);
    }

    public List<SalesDestinationVO> list(Map<String, Object> params) {
        return selectList("SalesDestinationDAO.list", params);
    }

    public SalesDestinationVO find(Map<String, Object> params) {
        return selectOne("SalesDestinationDAO.find", params);
    }

    public Long insert(Map<String, Object> params) {
        return selectOne("SalesDestinationDAO.insert", params);
    }

    public int updateDestination(Map<String, Object> params) {
        return update("SalesDestinationDAO.update", params);
    }

    public int countOrders(Map<String, Object> params) {
        return selectOne("SalesDestinationDAO.countOrders", params);
    }

    public int deleteDestination(Map<String, Object> params) {
        return delete("SalesDestinationDAO.delete", params);
    }
}
