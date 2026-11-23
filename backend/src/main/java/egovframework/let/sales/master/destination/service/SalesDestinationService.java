package egovframework.let.sales.master.destination.service;

import java.util.List;

import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationCustomerVO;

public interface SalesDestinationService {
    List<SalesDestinationCustomerVO> customers(Long tenantId, String keyword) throws Exception;
    List<SalesDestinationVO> list(Long tenantId, Long customerId) throws Exception;
    SalesDestinationVO create(Long tenantId, String userId, SalesDestinationVO input) throws Exception;
    SalesDestinationVO update(Long tenantId, String userId, Long id, SalesDestinationVO input) throws Exception;
    void delete(Long tenantId, Long id) throws Exception;
    void saveBatch(Long tenantId, String userId, Long customerId,
            List<SalesDestinationVO> inserted, List<SalesDestinationVO> updated) throws Exception;
}
