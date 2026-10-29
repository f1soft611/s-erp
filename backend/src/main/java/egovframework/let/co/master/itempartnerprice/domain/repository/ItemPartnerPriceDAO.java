package egovframework.let.co.master.itempartnerprice.domain.repository;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportResolutionVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;

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
}
