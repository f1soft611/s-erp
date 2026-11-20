package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceLookupService;

/**
 * 단가 조회 규칙(거래처 단가 → 공통단가, 기준일 유효, 시작일 최신, 통화·단가 결정)을 구현한 공통 서비스 클래스.
 *
 * @author S-ERP
 * @since 2026.11.20
 * @version 1.0
 */
@Service("itemPriceLookupService")
public class ItemPriceLookupServiceImpl implements ItemPriceLookupService {

    static final String DEFAULT_CURRENCY = "KRW";
    static final String DEFAULT_TAX_TYPE = "TAXABLE";
    private static final String PURCHASE = "매입";
    private static final String SALES = "매출";

    private final ItemPartnerPriceDAO dao;

    public ItemPriceLookupServiceImpl(ItemPartnerPriceDAO dao) {
        this.dao = dao;
    }

    @Override
    public ItemPriceLookupVO findPrice(Long tenantId, String tradeType, Long materialId, Long customerId,
            LocalDate baseDt) throws Exception {
        requireTenant(tenantId);
        String normalizedTradeType = tradeType == null ? "" : tradeType.trim();
        if (!PURCHASE.equals(normalizedTradeType) && !SALES.equals(normalizedTradeType)) {
            throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
        }
        if (materialId == null || materialId < 1L || customerId == null || customerId < 1L || baseDt == null) {
            throw new IllegalArgumentException("품목, 거래처, 기준일이 필요합니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialId", materialId);
        params.put("customerId", customerId);
        params.put("tradeType", normalizedTradeType);
        params.put("baseDt", baseDt.toString());
        ItemPriceLookupVO price = dao.selectLookupPrice(params);
        if (price == null) {
            return null;
        }
        price.setMaterialId(materialId);
        price.setSupplierId(customerId);
        applyPriceDefaults(price);
        return price;
    }

    @Override
    public Map<Long, ItemPriceLookupVO> findDefaultSupplierPrices(Long tenantId, Collection<Long> materialIds,
            LocalDate baseDt) throws Exception {
        requireTenant(tenantId);
        Map<Long, ItemPriceLookupVO> result = new LinkedHashMap<Long, ItemPriceLookupVO>();
        if (materialIds == null || materialIds.isEmpty()) {
            return result;
        }
        if (baseDt == null) {
            throw new IllegalArgumentException("기준일이 필요합니다.");
        }
        Set<Long> ids = new LinkedHashSet<Long>();
        for (Long id : materialIds) {
            if (id != null && id > 0L) {
                ids.add(id);
            }
        }
        if (ids.isEmpty()) {
            return result;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialIds", ids);
        params.put("baseDt", baseDt.toString());
        List<ItemPriceLookupVO> rows = dao.selectDefaultSupplierPrices(params);
        if (rows == null) {
            return result;
        }
        for (ItemPriceLookupVO row : rows) {
            if (row.getTaxType() == null) {
                // 기본 거래처는 있으나 기준일에 유효한 단가가 없다: 거래처만 채운다.
                row.setUnitPrice(null);
                row.setForeignUnitPrice(null);
                row.setForeignCurrency(null);
                row.setCurrency(null);
                row.setVatIncludedAt(null);
                row.setOrderType(null);
                row.setOrderTypeName(null);
            } else {
                applyPriceDefaults(row);
            }
            result.put(row.getMaterialId(), row);
        }
        return result;
    }

    /** 부가세 기본값과 통화·단가 결정(원화단가 우선, 외화단가만 있으면 외화통화·외화단가)을 적용한다. */
    private void applyPriceDefaults(ItemPriceLookupVO price) {
        if (!StringUtils.hasText(price.getTaxType())) {
            price.setTaxType(DEFAULT_TAX_TYPE);
        }
        if (!StringUtils.hasText(price.getVatIncludedAt())) {
            price.setVatIncludedAt("N");
        }
        if (price.getUnitPrice() == null && price.getForeignUnitPrice() != null) {
            price.setUnitPrice(price.getForeignUnitPrice());
            price.setCurrency(StringUtils.hasText(price.getForeignCurrency())
                    ? price.getForeignCurrency() : DEFAULT_CURRENCY);
        } else {
            price.setCurrency(DEFAULT_CURRENCY);
        }
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
