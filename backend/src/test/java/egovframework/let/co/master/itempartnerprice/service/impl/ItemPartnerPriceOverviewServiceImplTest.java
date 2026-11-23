package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceCustomerOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;

class ItemPartnerPriceOverviewServiceImplTest {
    private final ItemPartnerPriceDAO dao = mock(ItemPartnerPriceDAO.class);
    private final ItemPartnerPriceOverviewServiceImpl service = new ItemPartnerPriceOverviewServiceImpl(dao);
    private final String today = LocalDate.now().toString();

    @Test
    void returnsFlatItemRowsFromTheQueryForOneTradeType() throws Exception {
        ItemPriceOverviewRowVO first = material(1L, "A");
        first.setCustomerCount(2);
        first.setDefaultSupplierId(301L);
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Arrays.asList(first, material(2L, "B")));

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, condition("매입"));

        assertThat(rows).extracting(ItemPriceOverviewRowVO::getMaterialId).containsExactly(1L, 2L);
        assertThat(rows.get(0).getCustomerCount()).isEqualTo(2);
        assertThat(rows.get(0).getDefaultSupplierId()).isEqualTo(301L);
        assertThat(rows.get(1).getCustomerCount()).isZero();
        verify(dao).selectOverviewMaterials(argThat(params -> "매입".equals(params.get("tradeType"))));
    }

    @Test
    void passesFiltersAndParsedItemTypes() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Collections.emptyList());
        ItemPriceOverviewCondition condition = condition("매입");
        condition.setKeyword("  flour ");
        condition.setPriceFilter("NO_DEFAULT_SUPPLIER");
        condition.setItemTypes(" RAW, SUB ,RAW");

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, condition);

        assertThat(rows).isEmpty();
        verify(dao).selectOverviewMaterials(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && "flour".equals(params.get("keyword"))
                        && "NO_DEFAULT_SUPPLIER".equals(params.get("priceFilter"))
                        && Arrays.asList("RAW", "SUB").equals(params.get("itemTypes"))));
    }

    @Test
    void emptyItemTypesMeansAllAccounts() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Collections.emptyList());

        service.listOverview(9L, condition("매출"));

        verify(dao).selectOverviewMaterials(argThat(params ->
                ((List<?>) params.get("itemTypes")).isEmpty() && "ALL".equals(params.get("priceFilter"))));
    }

    @Test
    void rejectsUnknownFilterItemTypeMissingTenantAndTooManyItems() throws Exception {
        ItemPriceOverviewCondition bad = condition("매입");
        bad.setPriceFilter("NOPE");
        assertThatThrownBy(() -> service.listOverview(9L, bad)).isInstanceOf(IllegalArgumentException.class);
        ItemPriceOverviewCondition oldFilter = condition("매입");
        oldFilter.setPriceFilter("NO_COMMON_PRICE");
        assertThatThrownBy(() -> service.listOverview(9L, oldFilter)).isInstanceOf(IllegalArgumentException.class);
        ItemPriceOverviewCondition badType = condition("매입");
        badType.setItemTypes("RAW,ETC");
        assertThatThrownBy(() -> service.listOverview(9L, badType))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("계정분류");
        assertThatThrownBy(() -> service.listOverview(0L, condition("매입")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listOverview(9L, new ItemPriceOverviewCondition()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("거래구분");
        ItemPriceOverviewCondition salesDefault = condition("매출");
        salesDefault.setPriceFilter("NO_DEFAULT_SUPPLIER");
        assertThatThrownBy(() -> service.listOverview(9L, salesDefault))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("매입");

        List<ItemPriceOverviewRowVO> many = new ArrayList<ItemPriceOverviewRowVO>();
        for (long i = 1; i <= 2001; i++) many.add(material(i, "M" + i));
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(many);
        assertThatThrownBy(() -> service.listOverview(9L, condition("매입")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("좁혀");
    }

    @Test
    void customerOverviewPassesFiltersAndDefaultsEffectiveDateToToday() throws Exception {
        ItemPriceCustomerOverviewRowVO customer = new ItemPriceCustomerOverviewRowVO();
        customer.setCustomerId(301L);
        customer.setPriceCount(3);
        when(dao.selectCustomerOverview(anyMap())).thenReturn(Collections.singletonList(customer));
        ItemPriceCustomerOverviewCondition condition = customerCondition("매출");
        condition.setKeyword("  abc ");
        condition.setRegisterFilter("REGISTERED");
        condition.setItemTypes("PRODUCT,SEMI");

        List<ItemPriceCustomerOverviewRowVO> rows = service.listCustomerOverview(9L, condition);

        assertThat(rows).extracting(ItemPriceCustomerOverviewRowVO::getPriceCount).containsExactly(3);
        verify(dao).selectCustomerOverview(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && "abc".equals(params.get("keyword"))
                        && "매출".equals(params.get("tradeType"))
                        && "REGISTERED".equals(params.get("registerFilter"))
                        && Arrays.asList("PRODUCT", "SEMI").equals(params.get("itemTypes"))
                        && today.equals(params.get("effectiveOn"))));
    }

    @Test
    void customerOverviewDefaultsFilterAndRejectsBadInput() throws Exception {
        when(dao.selectCustomerOverview(anyMap())).thenReturn(Collections.emptyList());
        service.listCustomerOverview(9L, customerCondition("매입"));
        verify(dao).selectCustomerOverview(argThat(params -> "ALL".equals(params.get("registerFilter"))));

        ItemPriceCustomerOverviewCondition bad = customerCondition("매입");
        bad.setRegisterFilter("NOPE");
        assertThatThrownBy(() -> service.listCustomerOverview(9L, bad)).isInstanceOf(IllegalArgumentException.class);
        ItemPriceCustomerOverviewCondition badDate = customerCondition("매입");
        badDate.setEffectiveOn("2026-02-31");
        assertThatThrownBy(() -> service.listCustomerOverview(9L, badDate)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listCustomerOverview(0L, customerCondition("매입"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listCustomerOverview(9L, null)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("거래구분");

        List<ItemPriceCustomerOverviewRowVO> many = new ArrayList<ItemPriceCustomerOverviewRowVO>();
        for (long i = 1; i <= 2001; i++) {
            ItemPriceCustomerOverviewRowVO row = new ItemPriceCustomerOverviewRowVO();
            row.setCustomerId(i);
            many.add(row);
        }
        when(dao.selectCustomerOverview(anyMap())).thenReturn(many);
        assertThatThrownBy(() -> service.listCustomerOverview(9L, customerCondition("매입")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("좁혀");
    }

    private ItemPriceOverviewCondition condition(String tradeType) {
        ItemPriceOverviewCondition condition = new ItemPriceOverviewCondition();
        condition.setTradeType(tradeType);
        return condition;
    }

    private ItemPriceCustomerOverviewCondition customerCondition(String tradeType) {
        ItemPriceCustomerOverviewCondition condition = new ItemPriceCustomerOverviewCondition();
        condition.setTradeType(tradeType);
        return condition;
    }

    private ItemPriceOverviewRowVO material(Long id, String code) {
        ItemPriceOverviewRowVO row = new ItemPriceOverviewRowVO();
        row.setMaterialId(id);
        row.setMaterialCode(code);
        row.setMaterialName("name-" + code);
        row.setMaterialUnit("EA");
        return row;
    }
}
