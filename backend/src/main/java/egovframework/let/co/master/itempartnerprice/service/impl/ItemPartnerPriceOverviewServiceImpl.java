package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewSideVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceOverviewService;

@Service("itemPartnerPriceOverviewService")
public class ItemPartnerPriceOverviewServiceImpl implements ItemPartnerPriceOverviewService {
    private static final int MAX_ITEMS = 2000;
    private static final Set<String> FILTERS = new HashSet<String>();
    static {
        FILTERS.add("ALL");
        FILTERS.add("NO_PURCHASE");
        FILTERS.add("NO_SALES");
        FILTERS.add("HAS_SPECIAL");
    }

    private static final Set<String> REGISTER_FILTERS = new HashSet<String>();
    static {
        REGISTER_FILTERS.add("ALL");
        REGISTER_FILTERS.add("REGISTERED");
        REGISTER_FILTERS.add("UNREGISTERED");
    }

    private final ItemPartnerPriceDAO dao;

    public ItemPartnerPriceOverviewServiceImpl(ItemPartnerPriceDAO dao) {
        this.dao = dao;
    }

    @Override
    public List<ItemPriceOverviewRowVO> listOverview(Long tenantId, ItemPriceOverviewCondition condition)
            throws Exception {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        ItemPriceOverviewCondition search = condition == null ? new ItemPriceOverviewCondition() : condition;
        String filter = StringUtils.hasText(search.getPriceFilter()) ? search.getPriceFilter().trim() : "ALL";
        if (!FILTERS.contains(filter)) throw new IllegalArgumentException("단가 상태 조건이 올바르지 않습니다.");
        LocalDate effectiveOn = parseDate(search.getEffectiveOn());

        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("priceFilter", filter);
        params.put("effectiveOn", effectiveOn.toString());
        if (StringUtils.hasText(search.getKeyword())) params.put("keyword", search.getKeyword().trim());

        List<ItemPriceOverviewRowVO> materials = dao.selectOverviewMaterials(params);
        if (materials == null || materials.isEmpty()) return new ArrayList<ItemPriceOverviewRowVO>();
        if (materials.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("품목이 " + MAX_ITEMS + "건을 넘습니다. 검색 조건을 좁혀 주세요.");
        }
        List<Long> materialIds = new ArrayList<Long>();
        for (ItemPriceOverviewRowVO material : materials) materialIds.add(material.getMaterialId());
        params.put("materialIds", materialIds);
        List<ItemPartnerPriceVO> prices = dao.selectOverviewPrices(params);

        Map<String, ItemPartnerPriceVO> reference = pickReferenceRows(prices, effectiveOn);
        Map<Long, Map<Long, ItemPriceOverviewRowVO>> children = new HashMap<Long, Map<Long, ItemPriceOverviewRowVO>>();
        for (ItemPartnerPriceVO price : reference.values()) {
            if (price.getCustomerId() == null) continue;
            Map<Long, ItemPriceOverviewRowVO> byCustomer = children.get(price.getMaterialId());
            if (byCustomer == null) {
                byCustomer = new LinkedHashMap<Long, ItemPriceOverviewRowVO>();
                children.put(price.getMaterialId(), byCustomer);
            }
            ItemPriceOverviewRowVO child = byCustomer.get(price.getCustomerId());
            if (child == null) {
                child = new ItemPriceOverviewRowVO();
                child.setRowId("cust-" + price.getMaterialId() + "-" + price.getCustomerId());
                child.setParentId("item-" + price.getMaterialId());
                child.setMaterialId(price.getMaterialId());
                child.setCustomerId(price.getCustomerId());
                child.setCustomerCode(price.getCustomerCode());
                child.setCustomerName(price.getCustomerName());
                byCustomer.put(price.getCustomerId(), child);
            }
            assignSide(child, price, effectiveOn);
        }

        List<ItemPriceOverviewRowVO> result = new ArrayList<ItemPriceOverviewRowVO>();
        for (ItemPriceOverviewRowVO parent : materials) {
            parent.setRowId("item-" + parent.getMaterialId());
            parent.setParentId(null);
            assignSide(parent, reference.get(key(parent.getMaterialId(), null, "매입")), effectiveOn);
            assignSide(parent, reference.get(key(parent.getMaterialId(), null, "매출")), effectiveOn);
            Map<Long, ItemPriceOverviewRowVO> byCustomer = children.get(parent.getMaterialId());
            List<ItemPriceOverviewRowVO> childRows = byCustomer == null
                    ? new ArrayList<ItemPriceOverviewRowVO>() : new ArrayList<ItemPriceOverviewRowVO>(byCustomer.values());
            Collections.sort(childRows, new Comparator<ItemPriceOverviewRowVO>() {
                @Override
                public int compare(ItemPriceOverviewRowVO left, ItemPriceOverviewRowVO right) {
                    return String.valueOf(left.getCustomerCode()).compareTo(String.valueOf(right.getCustomerCode()));
                }
            });
            parent.setSpecialCount(childRows.size());
            result.add(parent);
            result.addAll(childRows);
        }
        return result;
    }

    @Override
    public List<ItemPriceCustomerOverviewRowVO> listCustomerOverview(Long tenantId,
            ItemPriceCustomerOverviewCondition condition) throws Exception {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        ItemPriceCustomerOverviewCondition search =
                condition == null ? new ItemPriceCustomerOverviewCondition() : condition;
        String filter = StringUtils.hasText(search.getRegisterFilter()) ? search.getRegisterFilter().trim() : "ALL";
        if (!REGISTER_FILTERS.contains(filter)) throw new IllegalArgumentException("단가 등록 여부 조건이 올바르지 않습니다.");
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("registerFilter", filter);
        params.put("effectiveOn", parseDate(search.getEffectiveOn()).toString());
        if (StringUtils.hasText(search.getKeyword())) params.put("keyword", search.getKeyword().trim());
        List<ItemPriceCustomerOverviewRowVO> customers = dao.selectCustomerOverview(params);
        if (customers == null) return new ArrayList<ItemPriceCustomerOverviewRowVO>();
        if (customers.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("거래처가 " + MAX_ITEMS + "건을 넘습니다. 검색 조건을 좁혀 주세요.");
        }
        return customers;
    }

    /** (품목, 거래처 또는 기본, 거래구분)마다 기준일에 적용 중인 행을 우선하고, 없으면 가장 빠른 예정 행을 고른다. */
    private Map<String, ItemPartnerPriceVO> pickReferenceRows(List<ItemPartnerPriceVO> prices, LocalDate effectiveOn) {
        Map<String, ItemPartnerPriceVO> picked = new LinkedHashMap<String, ItemPartnerPriceVO>();
        if (prices == null) return picked;
        for (ItemPartnerPriceVO price : prices) {
            LocalDate start = LocalDate.parse(price.getStartDt());
            LocalDate end = StringUtils.hasText(price.getEndDt()) ? LocalDate.parse(price.getEndDt()) : null;
            if (end != null && end.isBefore(effectiveOn)) continue;
            String key = key(price.getMaterialId(), price.getCustomerId(), price.getTradeType());
            ItemPartnerPriceVO current = picked.get(key);
            if (current == null || better(start, LocalDate.parse(current.getStartDt()), effectiveOn)) {
                picked.put(key, price);
            }
        }
        return picked;
    }

    private boolean better(LocalDate candidateStart, LocalDate currentStart, LocalDate effectiveOn) {
        boolean candidateCurrent = !candidateStart.isAfter(effectiveOn);
        boolean currentCurrent = !currentStart.isAfter(effectiveOn);
        if (candidateCurrent != currentCurrent) return candidateCurrent;
        return candidateCurrent ? candidateStart.isAfter(currentStart) : candidateStart.isBefore(currentStart);
    }

    private void assignSide(ItemPriceOverviewRowVO row, ItemPartnerPriceVO price, LocalDate effectiveOn) {
        if (price == null) return;
        ItemPriceOverviewSideVO side = new ItemPriceOverviewSideVO();
        side.setPriceId(price.getPriceId());
        side.setUnitPrice(price.getUnitPrice());
        side.setTaxType(price.getTaxType());
        side.setVatIncludedAt(price.getVatIncludedAt());
        side.setForeignUnitPrice(price.getForeignUnitPrice());
        side.setCurrency(price.getCurrency());
        side.setMoq(price.getMoq());
        side.setStartDt(price.getStartDt());
        side.setEndDt(price.getEndDt());
        side.setPriceStatus(LocalDate.parse(price.getStartDt()).isAfter(effectiveOn) ? "future" : "current");
        if ("매입".equals(price.getTradeType())) row.setPurchase(side);
        else row.setSales(side);
    }

    private String key(Long materialId, Long customerId, String tradeType) {
        return materialId + "|" + (customerId == null ? "default" : customerId) + "|" + tradeType;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) return LocalDate.now();
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("적용 기준일은 YYYY-MM-DD 형식이어야 합니다.");
        }
    }
}
