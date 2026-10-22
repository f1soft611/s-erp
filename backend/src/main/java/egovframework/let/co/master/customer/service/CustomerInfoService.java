package egovframework.let.co.master.customer.service;

import java.util.List;

import egovframework.let.co.master.customer.domain.model.CustomerInfoSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSearchCondition;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;

public interface CustomerInfoService {

    List<CustomerInfoVO> listCustomers(Long tenantId) throws Exception;

    List<CustomerInfoVO> listCustomers(Long tenantId, CustomerInfoSearchCondition condition)
            throws Exception;

    CustomerInfoVO createCustomer(
            Long tenantId, Long currentUserId, CustomerInfoSaveRequestVO payload) throws Exception;

    CustomerInfoVO updateCustomer(
            Long tenantId, Long currentUserId, Long customerId,
            CustomerInfoSaveRequestVO payload) throws Exception;
}
