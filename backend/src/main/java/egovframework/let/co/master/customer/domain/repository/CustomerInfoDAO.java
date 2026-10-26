package egovframework.let.co.master.customer.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;

@Repository("customerInfoDAO")
public class CustomerInfoDAO extends EgovAbstractMapper {

    public List<CustomerInfoVO> selectCustomerList(Long tenantId) throws Exception {
        Map<String, Object> params = new java.util.HashMap<>();
        params.put("tenantId", tenantId);
        return selectCustomerList(params);
    }

    public List<CustomerInfoVO> selectCustomerList(Map<String, Object> params) throws Exception {
        return selectList("CustomerInfoDAO.selectCustomerList", params);
    }

    public CustomerInfoVO selectCustomerById(Map<String, Object> params) throws Exception {
        return selectOne("CustomerInfoDAO.selectCustomerById", params);
    }

    public Long selectCustomerIdByCode(Map<String, Object> params) throws Exception {
        return selectOne("CustomerInfoDAO.selectCustomerIdByCode", params);
    }

    public Long selectCustomerIdByName(Map<String, Object> params) throws Exception {
        return selectOne("CustomerInfoDAO.selectCustomerIdByName", params);
    }

    public Long selectCustomerIdByBusinessNo(Map<String, Object> params) throws Exception {
        return selectOne("CustomerInfoDAO.selectCustomerIdByBusinessNo", params);
    }

    public Long insertCustomer(Map<String, Object> params) throws Exception {
        return selectOne("CustomerInfoDAO.insertCustomer", params);
    }

    public int updateCustomer(Map<String, Object> params) throws Exception {
        return update("CustomerInfoDAO.updateCustomer", params);
    }
}
