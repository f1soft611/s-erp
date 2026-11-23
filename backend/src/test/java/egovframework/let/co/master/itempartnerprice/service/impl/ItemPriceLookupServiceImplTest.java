package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;

class ItemPriceLookupServiceImplTest {
    private static final Long TENANT = 1L;
    private static final LocalDate BASE = LocalDate.of(2026, 11, 20);

    private final ItemPartnerPriceDAO dao = mock(ItemPartnerPriceDAO.class);
    private final ItemPriceLookupServiceImpl service = new ItemPriceLookupServiceImpl(dao);

    @Test
    void wonPriceUsesKrwAndFillsTaxDefaults() throws Exception {
        ItemPriceLookupVO row = new ItemPriceLookupVO();
        row.setUnitPrice(new BigDecimal("1500"));
        row.setForeignUnitPrice(new BigDecimal("1.5"));
        row.setForeignCurrency("USD");
        when(dao.selectLookupPrice(anyMap())).thenReturn(row);

        ItemPriceLookupVO result = service.findPrice(TENANT, "매입", 12L, 5L, BASE);

        assertThat(result.getCurrency()).isEqualTo("KRW");
        assertThat(result.getUnitPrice()).isEqualByComparingTo("1500");
        assertThat(result.getTaxType()).isEqualTo("TAXABLE");
        assertThat(result.getVatIncludedAt()).isEqualTo("N");
        assertThat(result.getForeignCurrency()).isEqualTo("USD");
        assertThat(result.getMaterialId()).isEqualTo(12L);
        assertThat(result.getSupplierId()).isEqualTo(5L);
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(dao).selectLookupPrice(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("tradeType", "매입")
                .containsEntry("baseDt", "2026-11-20");
    }

    @Test
    void foreignOnlyPriceUsesForeignCurrencyAndKeepsTheStoredTaxType() throws Exception {
        ItemPriceLookupVO row = new ItemPriceLookupVO();
        row.setForeignUnitPrice(new BigDecimal("7.25"));
        row.setForeignCurrency("USD");
        row.setTaxType("ZERO_RATED");
        row.setVatIncludedAt("N");
        when(dao.selectLookupPrice(anyMap())).thenReturn(row);

        ItemPriceLookupVO result = service.findPrice(TENANT, "매입", 12L, 5L, BASE);

        assertThat(result.getCurrency()).isEqualTo("USD");
        assertThat(result.getUnitPrice()).isEqualByComparingTo("7.25");
        assertThat(result.getTaxType()).isEqualTo("ZERO_RATED");
    }

    @Test
    void returnsNullWhenNoValidPriceAndRejectsBadArguments() throws Exception {
        when(dao.selectLookupPrice(anyMap())).thenReturn(null);
        assertThat(service.findPrice(TENANT, "매입", 12L, 5L, BASE)).isNull();
        assertThatThrownBy(() -> service.findPrice(TENANT, "기타", 12L, 5L, BASE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.findPrice(TENANT, "매입", 12L, null, BASE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.findPrice(null, "매입", 12L, 5L, BASE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void purchaseSupplierWithoutValidPriceKeepsOnlyTheSupplier() throws Exception {
        ItemPriceLookupVO withPrice = new ItemPriceLookupVO();
        withPrice.setMaterialId(100L);
        withPrice.setSupplierId(7L);
        withPrice.setTaxType("TAXABLE");
        withPrice.setUnitPrice(new BigDecimal("900"));
        withPrice.setOrderType("DOMESTIC");
        ItemPriceLookupVO noPrice = new ItemPriceLookupVO();
        noPrice.setMaterialId(200L);
        noPrice.setSupplierId(8L);
        noPrice.setSupplierName("공급사8");
        noPrice.setOrderType("STALE");
        when(dao.selectPurchasePrices(anyMap())).thenReturn(Arrays.asList(withPrice, noPrice));

        Map<Long, ItemPriceLookupVO> result = service.findPurchasePrices(TENANT, Arrays.asList(100L, 200L, 300L), BASE);

        assertThat(result).containsOnlyKeys(100L, 200L);
        assertThat(result.get(100L).getCurrency()).isEqualTo("KRW");
        assertThat(result.get(100L).getOrderType()).isEqualTo("DOMESTIC");
        assertThat(result.get(200L).getSupplierId()).isEqualTo(8L);
        assertThat(result.get(200L).getUnitPrice()).isNull();
        assertThat(result.get(200L).getCurrency()).isNull();
        assertThat(result.get(200L).getOrderType()).isNull();
    }

    @Test
    void emptyMaterialListSkipsTheQuery() throws Exception {
        assertThat(service.findPurchasePrices(TENANT, Collections.<Long>emptyList(), BASE)).isEmpty();
        assertThat(service.findPurchasePrices(TENANT, Arrays.asList((Long) null, 0L), BASE)).isEmpty();
        verifyNoInteractions(dao);
        assertThatThrownBy(() -> service.findPurchasePrices(TENANT, Arrays.asList(1L), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class) Map.class);
    }
}
