package egovframework.let.co.master.itempartnerprice.service;

import java.util.List;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportValidationVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSearchCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;

public interface ItemPartnerPriceService {
    List<ItemPartnerPriceVO> listPrices(Long tenantId, ItemPartnerPriceSearchCondition condition) throws Exception;

    ItemPartnerPriceImportValidationVO validateImport(Long tenantId, List<ItemPartnerPriceImportRowVO> rows)
            throws Exception;

    ItemPartnerPriceVO createPrice(Long tenantId, String actor, ItemPartnerPriceSaveRequestVO payload)
            throws Exception;

    ItemPartnerPriceVO updatePrice(Long tenantId, String actor, Long priceId,
            ItemPartnerPriceSaveRequestVO payload) throws Exception;
}
