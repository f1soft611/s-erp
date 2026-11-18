package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
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
    void buildsItemParentsWithDefaultPricesAndSpecialCustomerChildren() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Arrays.asList(material(1L, "A"), material(2L, "B")));
        when(dao.selectOverviewPrices(anyMap())).thenReturn(Arrays.asList(
                price(10L, 1L, null, "매입", "1000", daysFromToday(-10), null),
                price(11L, 1L, null, "매출", "1500", daysFromToday(-10), null),
                price(12L, 1L, 301L, "매입", "900", daysFromToday(-5), null),
                price(13L, 1L, 302L, "매출", "1400", daysFromToday(-5), null)));

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, new ItemPriceOverviewCondition());

        assertThat(rows).extracting(ItemPriceOverviewRowVO::getRowId)
                .containsExactly("item-1", "cust-1-301", "cust-1-302", "item-2");
        ItemPriceOverviewRowVO parent = rows.get(0);
        assertThat(parent.getParentId()).isNull();
        assertThat(parent.getSpecialCount()).isEqualTo(2);
        assertThat(parent.getPurchase().getUnitPrice()).isEqualByComparingTo("1000");
        assertThat(parent.getSales().getUnitPrice()).isEqualByComparingTo("1500");
        assertThat(parent.getPurchase().getMoq()).isEqualByComparingTo("5");
        ItemPriceOverviewRowVO child = rows.get(1);
        assertThat(child.getParentId()).isEqualTo("item-1");
        assertThat(child.getCustomerId()).isEqualTo(301L);
        assertThat(child.getPurchase().getUnitPrice()).isEqualByComparingTo("900");
        assertThat(child.getSales()).isNull();
        ItemPriceOverviewRowVO noPrice = rows.get(3);
        assertThat(noPrice.getPurchase()).isNull();
        assertThat(noPrice.getSales()).isNull();
        assertThat(noPrice.getSpecialCount()).isZero();
    }

    @Test
    void keepsItemsWithOnlySpecialPriceAndNoDefaultPrice() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Collections.singletonList(material(1L, "A")));
        when(dao.selectOverviewPrices(anyMap())).thenReturn(Collections.singletonList(
                price(12L, 1L, 301L, "매입", "900", daysFromToday(-5), null)));

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, new ItemPriceOverviewCondition());

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).getPurchase()).isNull();
        assertThat(rows.get(0).getSpecialCount()).isEqualTo(1);
    }

    @Test
    void prefersCurrentRowOverFutureAndFallsBackToEarliestFuture() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Arrays.asList(material(1L, "A"), material(2L, "B")));
        when(dao.selectOverviewPrices(anyMap())).thenReturn(Arrays.asList(
                price(10L, 1L, null, "매입", "1000", daysFromToday(-10), daysFromToday(9)),
                price(11L, 1L, null, "매입", "1200", daysFromToday(10), null),
                price(20L, 2L, null, "매입", "700", daysFromToday(30), null),
                price(21L, 2L, null, "매입", "800", daysFromToday(10), daysFromToday(29))));

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, new ItemPriceOverviewCondition());

        assertThat(rows.get(0).getPurchase().getPriceId()).isEqualTo(10L);
        assertThat(rows.get(0).getPurchase().getPriceStatus()).isEqualTo("current");
        assertThat(rows.get(1).getPurchase().getPriceId()).isEqualTo(21L);
        assertThat(rows.get(1).getPurchase().getPriceStatus()).isEqualTo("future");
    }

    @Test
    void passesFiltersAndDefaultsEffectiveDateToToday() throws Exception {
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(Collections.emptyList());
        ItemPriceOverviewCondition condition = new ItemPriceOverviewCondition();
        condition.setKeyword("  flour ");
        condition.setPriceFilter("NO_PURCHASE");

        List<ItemPriceOverviewRowVO> rows = service.listOverview(9L, condition);

        assertThat(rows).isEmpty();
        verify(dao).selectOverviewMaterials(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && "flour".equals(params.get("keyword"))
                        && "NO_PURCHASE".equals(params.get("priceFilter"))
                        && today.equals(params.get("effectiveOn"))));
        verify(dao, never()).selectOverviewPrices(anyMap());
    }

    @Test
    void rejectsUnknownFilterBadDateMissingTenantAndTooManyItems() throws Exception {
        ItemPriceOverviewCondition bad = new ItemPriceOverviewCondition();
        bad.setPriceFilter("NOPE");
        assertThatThrownBy(() -> service.listOverview(9L, bad)).isInstanceOf(IllegalArgumentException.class);
        ItemPriceOverviewCondition badDate = new ItemPriceOverviewCondition();
        badDate.setEffectiveOn("2026-02-31");
        assertThatThrownBy(() -> service.listOverview(9L, badDate)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listOverview(0L, new ItemPriceOverviewCondition()))
                .isInstanceOf(IllegalArgumentException.class);

        List<ItemPriceOverviewRowVO> many = new ArrayList<ItemPriceOverviewRowVO>();
        for (long i = 1; i <= 2001; i++) many.add(material(i, "M" + i));
        when(dao.selectOverviewMaterials(anyMap())).thenReturn(many);
        assertThatThrownBy(() -> service.listOverview(9L, new ItemPriceOverviewCondition()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("좁혀");
    }

    @Test
    void customerOverviewPassesFiltersAndDefaultsEffectiveDateToToday() throws Exception {
        ItemPriceCustomerOverviewRowVO customer = new ItemPriceCustomerOverviewRowVO();
        customer.setCustomerId(301L);
        customer.setPriceCount(3);
        when(dao.selectCustomerOverview(anyMap())).thenReturn(Collections.singletonList(customer));
        ItemPriceCustomerOverviewCondition condition = new ItemPriceCustomerOverviewCondition();
        condition.setKeyword("  abc ");
        condition.setRegisterFilter("REGISTERED");

        List<ItemPriceCustomerOverviewRowVO> rows = service.listCustomerOverview(9L, condition);

        assertThat(rows).extracting(ItemPriceCustomerOverviewRowVO::getPriceCount).containsExactly(3);
        verify(dao).selectCustomerOverview(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && "abc".equals(params.get("keyword"))
                        && "REGISTERED".equals(params.get("registerFilter"))
                        && today.equals(params.get("effectiveOn"))));
    }

    @Test
    void customerOverviewDefaultsFilterAndRejectsBadInput() throws Exception {
        when(dao.selectCustomerOverview(anyMap())).thenReturn(Collections.emptyList());
        service.listCustomerOverview(9L, null);
        verify(dao).selectCustomerOverview(argThat(params -> "ALL".equals(params.get("registerFilter"))));

        ItemPriceCustomerOverviewCondition bad = new ItemPriceCustomerOverviewCondition();
        bad.setRegisterFilter("NOPE");
        assertThatThrownBy(() -> service.listCustomerOverview(9L, bad)).isInstanceOf(IllegalArgumentException.class);
        ItemPriceCustomerOverviewCondition badDate = new ItemPriceCustomerOverviewCondition();
        badDate.setEffectiveOn("2026-02-31");
        assertThatThrownBy(() -> service.listCustomerOverview(9L, badDate)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.listCustomerOverview(0L, null)).isInstanceOf(IllegalArgumentException.class);

        List<ItemPriceCustomerOverviewRowVO> many = new ArrayList<ItemPriceCustomerOverviewRowVO>();
        for (long i = 1; i <= 2001; i++) {
            ItemPriceCustomerOverviewRowVO row = new ItemPriceCustomerOverviewRowVO();
            row.setCustomerId(i);
            many.add(row);
        }
        when(dao.selectCustomerOverview(anyMap())).thenReturn(many);
        assertThatThrownBy(() -> service.listCustomerOverview(9L, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("좁혀");
    }

    private String daysFromToday(int days) {
        return LocalDate.now().plusDays(days).toString();
    }

    private ItemPriceOverviewRowVO material(Long id, String code) {
        ItemPriceOverviewRowVO row = new ItemPriceOverviewRowVO();
        row.setMaterialId(id);
        row.setMaterialCode(code);
        row.setMaterialName("name-" + code);
        row.setMaterialUnit("EA");
        return row;
    }

    private ItemPartnerPriceVO price(Long priceId, Long materialId, Long customerId, String tradeType,
            String unitPrice, String start, String end) {
        ItemPartnerPriceVO row = new ItemPartnerPriceVO();
        row.setPriceId(priceId);
        row.setMaterialId(materialId);
        row.setCustomerId(customerId);
        if (customerId != null) {
            row.setCustomerCode("C" + customerId);
            row.setCustomerName("customer-" + customerId);
        }
        row.setTradeType(tradeType);
        row.setUnitPrice(new BigDecimal(unitPrice));
        row.setTaxType("TAXABLE");
        row.setVatIncludedAt("N");
        row.setMoq(new BigDecimal("5"));
        row.setStartDt(start);
        row.setEndDt(end);
        return row;
    }
}
