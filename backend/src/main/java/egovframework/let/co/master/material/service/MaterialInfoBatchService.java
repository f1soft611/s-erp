package egovframework.let.co.master.material.service;

import egovframework.let.co.master.material.domain.model.MaterialInfoBatchSaveRequestVO;
import egovframework.let.co.master.material.domain.model.MaterialInfoBatchSaveResultVO;

public interface MaterialInfoBatchService {
    MaterialInfoBatchSaveResultVO saveBatch(Long tenantId, String actor, MaterialInfoBatchSaveRequestVO payload) throws Exception;
}
