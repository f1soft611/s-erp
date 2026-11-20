package egovframework.let.co.master.itempartnerprice.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportResolutionVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;

@Repository("itemPartnerPriceDAO")
public class ItemPartnerPriceDAO extends EgovAbstractMapper {
    public List<ItemPartnerPriceVO> selectItemPartnerPriceList(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectItemPartnerPriceList", params);
    }

    public List<ItemPartnerPriceImportResolutionVO> resolveImportRows(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.resolveImportRows", params);
    }

    public ItemPartnerPriceVO selectItemPartnerPriceById(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectItemPartnerPriceById", params);
    }

    public ItemPartnerPriceVO selectActiveMaterial(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectActiveMaterial", params);
    }

    public ItemPartnerPriceVO selectActiveCustomer(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectActiveCustomer", params);
    }

    public Long selectPriceIdByBusinessKey(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectPriceIdByBusinessKey", params);
    }

    public Long insertItemPartnerPrice(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.insertItemPartnerPrice", params);
    }

    public int updateItemPartnerPrice(Map<String, Object> params) throws Exception {
        return update("ItemPartnerPriceDAO.updateItemPartnerPrice", params);
    }

    public List<ItemPriceOverviewRowVO> selectOverviewMaterials(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectOverviewMaterials", params);
    }

    public List<ItemPartnerPriceVO> selectOverviewPrices(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectOverviewPrices", params);
    }

    public List<ItemPriceCustomerOverviewRowVO> selectCustomerOverview(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectCustomerOverview", params);
    }

    public Long selectPredecessorPriceId(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectPredecessorPriceId", params);
    }

    public int reopenPrice(Map<String, Object> params) throws Exception {
        return update("ItemPartnerPriceDAO.reopenPrice", params);
    }

    public int deleteItemPartnerPrice(Map<String, Object> params) throws Exception {
        return delete("ItemPartnerPriceDAO.deleteItemPartnerPrice", params);
    }

    public Boolean existsCommonCode(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.existsCommonCode", params);
    }

    public Long selectOverlappingPriceId(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectOverlappingPriceId", params);
    }

    public int closePreviousOpenPrices(Map<String, Object> params) throws Exception {
        return update("ItemPartnerPriceDAO.closePreviousOpenPrices", params);
    }

    public List<ItemPriceOverviewRowVO> selectDefaultSuppliers(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectDefaultSuppliers", params);
    }

    public Boolean existsActivePurchasePrice(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.existsActivePurchasePrice", params);
    }

    public int upsertDefaultSupplier(Map<String, Object> params) throws Exception {
        return update("ItemPartnerPriceDAO.upsertDefaultSupplier", params);
    }

    public int deleteDefaultSupplier(Map<String, Object> params) throws Exception {
        return delete("ItemPartnerPriceDAO.deleteDefaultSupplier", params);
    }

    public List<Long> deleteOrphanDefaultSuppliers(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.deleteOrphanDefaultSuppliers", params);
    }

    public List<Long> selectMaterialIdsByPriceIds(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectMaterialIdsByPriceIds", params);
    }

    public String selectOrderTypeCode(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectOrderTypeCode", params);
    }

    public ItemPriceLookupVO selectLookupPrice(Map<String, Object> params) throws Exception {
        return selectOne("ItemPartnerPriceDAO.selectLookupPrice", params);
    }

    public List<ItemPriceLookupVO> selectDefaultSupplierPrices(Map<String, Object> params) throws Exception {
        return selectList("ItemPartnerPriceDAO.selectDefaultSupplierPrices", params);
    }
}
