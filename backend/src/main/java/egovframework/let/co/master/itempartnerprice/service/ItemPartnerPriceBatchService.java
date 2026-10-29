package egovframework.let.co.master.itempartnerprice.service;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveResultVO;

public interface ItemPartnerPriceBatchService {
    ItemPartnerPriceBatchSaveResultVO saveBatch(Long tenantId, String actor,
            ItemPartnerPriceBatchSaveRequestVO payload) throws Exception;
}
