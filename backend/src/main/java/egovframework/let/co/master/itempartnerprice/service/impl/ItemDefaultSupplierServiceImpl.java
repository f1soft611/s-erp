package egovframework.let.co.master.itempartnerprice.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemDefaultSupplierService;

/**
 * 품목별 매입 기본 거래처 지정·해제·정리를 구현한 서비스 클래스. 품목당 1행은 DB 유일 키가 보장한다.
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
@Service("itemDefaultSupplierService")
public class ItemDefaultSupplierServiceImpl implements ItemDefaultSupplierService {

    private final ItemPartnerPriceDAO dao;

    public ItemDefaultSupplierServiceImpl(ItemPartnerPriceDAO dao) {
        this.dao = dao;
    }

    @Override
    public List<Long> findMaterialIdsByPriceIds(Long tenantId, Collection<Long> priceIds) throws Exception {
        return findMaterialIdsByPriceIds(tenantId, priceIds, null);
    }

    @Override
    public List<String> findMaterialsMissingDefaultSupplier(Long tenantId, Collection<Long> materialIds)
            throws Exception {
        requireTenant(tenantId);
        List<String> labels = new ArrayList<String>();
        Set<Long> ids = positive(materialIds);
        if (ids.isEmpty()) {
            return labels;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialIds", ids);
        List<ItemPriceOverviewRowVO> rows = dao.selectMaterialsMissingDefaultSupplier(params);
        if (rows != null) {
            for (ItemPriceOverviewRowVO row : rows) {
                labels.add(row.getMaterialCode() + " " + row.getMaterialName());
            }
        }
        return labels;
    }

    @Override
    public List<Long> findMaterialIdsByPriceIds(Long tenantId, Collection<Long> priceIds, String tradeType)
            throws Exception {
        requireTenant(tenantId);
        Set<Long> ids = positive(priceIds);
        if (ids.isEmpty()) {
            return new ArrayList<Long>();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("priceIds", ids);
        if (StringUtils.hasText(tradeType)) {
            params.put("tradeType", tradeType.trim());
        }
        List<Long> found = dao.selectMaterialIdsByPriceIds(params);
        return found == null ? new ArrayList<Long>() : found;
    }

    @Override
    public Map<Long, Long> findDefaultSupplierIds(Long tenantId, Collection<Long> materialIds) throws Exception {
        requireTenant(tenantId);
        Map<Long, Long> result = new LinkedHashMap<Long, Long>();
        Set<Long> ids = positive(materialIds);
        if (ids.isEmpty()) {
            return result;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialIds", ids);
        List<ItemPriceOverviewRowVO> rows = dao.selectDefaultSuppliers(params);
        if (rows != null) {
            for (ItemPriceOverviewRowVO row : rows) {
                result.put(row.getMaterialId(), row.getCustomerId());
            }
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setDefault(Long tenantId, String actor, Long materialId, Long customerId) throws Exception {
        requireTenant(tenantId);
        if (!StringUtils.hasText(actor) || actor.trim().length() > 10) {
            throw new IllegalArgumentException("인증 사용자 정보를 확인할 수 없습니다.");
        }
        if (materialId == null || materialId < 1L || customerId == null || customerId < 1L) {
            throw new IllegalArgumentException("기본 거래처로 지정할 품목과 거래처가 필요합니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialId", materialId);
        params.put("customerId", customerId);
        if (!Boolean.TRUE.equals(dao.existsActivePurchasePrice(params))) {
            throw new IllegalArgumentException("매입 단가가 등록된 거래처만 기본 거래처로 지정할 수 있습니다.");
        }
        params.put("actor", actor.trim());
        dao.upsertDefaultSupplier(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void clearIfCurrent(Long tenantId, Long materialId, Long customerId) throws Exception {
        requireTenant(tenantId);
        if (materialId == null || customerId == null) {
            return;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialId", materialId);
        params.put("customerId", customerId);
        dao.deleteDefaultSupplier(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<Long> clearOrphans(Long tenantId, Collection<Long> materialIds) throws Exception {
        requireTenant(tenantId);
        Set<Long> ids = positive(materialIds);
        if (ids.isEmpty()) {
            return new ArrayList<Long>();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialIds", ids);
        List<Long> cleared = dao.deleteOrphanDefaultSuppliers(params);
        return cleared == null ? new ArrayList<Long>() : cleared;
    }

    private Set<Long> positive(Collection<Long> values) {
        Set<Long> ids = new LinkedHashSet<Long>();
        if (values != null) {
            for (Long value : values) {
                if (value != null && value > 0L) {
                    ids.add(value);
                }
            }
        }
        return ids;
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null || tenantId <= 0L) {
            throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        }
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        return params;
    }
}
