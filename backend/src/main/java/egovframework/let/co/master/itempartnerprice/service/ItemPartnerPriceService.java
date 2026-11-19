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

    /** 오등록 정정용 물리 삭제. 종료된 과거 단가는 삭제할 수 없고, 삭제 행이 자동 종료시킨 직전 단가의 종료일을 다시 연다. */
    void deletePrice(Long tenantId, String actor, Long priceId) throws Exception;
}
