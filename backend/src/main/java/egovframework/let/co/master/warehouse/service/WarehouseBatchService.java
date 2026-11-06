package egovframework.let.co.master.warehouse.service;

import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseBatchSaveResultVO;

public interface WarehouseBatchService {

    WarehouseBatchSaveResultVO saveBatch(
            Long tenantId, Long currentUserId, WarehouseBatchSaveRequestVO payload) throws Exception;
}
