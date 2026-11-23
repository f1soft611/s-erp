package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceOverviewService;

@Service("itemPartnerPriceOverviewService")
public class ItemPartnerPriceOverviewServiceImpl implements ItemPartnerPriceOverviewService {
    private static final int MAX_ITEMS = 2000;
    private static final Set<String> FILTERS = new HashSet<String>();
    static {
        FILTERS.add("ALL");
        FILTERS.add("NO_PRICE");
        FILTERS.add("NO_DEFAULT_SUPPLIER");
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
        String tradeType = requireTradeType(search.getTradeType());
        if ("NO_DEFAULT_SUPPLIER".equals(filter) && !"매입".equals(tradeType)) {
            throw new IllegalArgumentException("기본 거래처 미지정 조건은 매입 단가에서만 쓸 수 있습니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("priceFilter", filter);
        params.put("tradeType", tradeType);
        params.put("itemTypes", ItemTypeFilters.parse(search.getItemTypes()));
        if (StringUtils.hasText(search.getKeyword())) params.put("keyword", search.getKeyword().trim());

        List<ItemPriceOverviewRowVO> materials = dao.selectOverviewMaterials(params);
        if (materials == null) return new ArrayList<ItemPriceOverviewRowVO>();
        if (materials.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("품목이 " + MAX_ITEMS + "건을 넘습니다. 검색 조건을 좁혀 주세요.");
        }
        return materials;
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
        params.put("tradeType", requireTradeType(search.getTradeType()));
        params.put("effectiveOn", parseDate(search.getEffectiveOn()).toString());
        params.put("itemTypes", ItemTypeFilters.parse(search.getItemTypes()));
        if (StringUtils.hasText(search.getKeyword())) params.put("keyword", search.getKeyword().trim());
        List<ItemPriceCustomerOverviewRowVO> customers = dao.selectCustomerOverview(params);
        if (customers == null) return new ArrayList<ItemPriceCustomerOverviewRowVO>();
        if (customers.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("거래처가 " + MAX_ITEMS + "건을 넘습니다. 검색 조건을 좁혀 주세요.");
        }
        return customers;
    }

    private String requireTradeType(String value) {
        String tradeType = value == null ? "" : value.trim();
        if (!"매입".equals(tradeType) && !"매출".equals(tradeType)) {
            throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
        }
        return tradeType;
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
