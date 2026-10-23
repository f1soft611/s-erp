package egovframework.let.co.master.customer.service;

import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveResultVO;

public interface CustomerInfoBatchService {

    CustomerInfoBatchSaveResultVO saveBatch(
            Long tenantId, Long currentUserId, CustomerInfoBatchSaveRequestVO payload) throws Exception;
}
