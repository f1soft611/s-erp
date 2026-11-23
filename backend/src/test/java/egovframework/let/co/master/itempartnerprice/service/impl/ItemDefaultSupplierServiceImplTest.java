package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceOverviewRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;

class ItemDefaultSupplierServiceImplTest {
    private static final Long TENANT = 1L;

    private final ItemPartnerPriceDAO dao = mock(ItemPartnerPriceDAO.class);
    private final ItemDefaultSupplierServiceImpl service = new ItemDefaultSupplierServiceImpl(dao);

    @Test
    void setDefaultRequiresAnActivePurchasePriceOfThatSupplier() throws Exception {
        when(dao.existsActivePurchasePrice(anyMap())).thenReturn(false);
        assertThatThrownBy(() -> service.setDefault(TENANT, "101", 10L, 20L))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("매입 단가");
        verify(dao, never()).upsertDefaultSupplier(anyMap());

        when(dao.existsActivePurchasePrice(anyMap())).thenReturn(true);
        service.setDefault(TENANT, " 101 ", 10L, 20L);
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(dao).upsertDefaultSupplier(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("materialId", 10L)
                .containsEntry("customerId", 20L).containsEntry("actor", "101");
    }

    @Test
    void setDefaultValidatesActorAndIds() throws Exception {
        assertThatThrownBy(() -> service.setDefault(TENANT, "12345678901", 10L, 20L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.setDefault(TENANT, "101", null, 20L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.setDefault(TENANT, "101", 10L, 0L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.setDefault(null, "101", 10L, 20L))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(dao);
    }

    @Test
    void clearIfCurrentDeletesOnlyThatSupplier() throws Exception {
        service.clearIfCurrent(TENANT, 10L, 20L);
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(dao).deleteDefaultSupplier(params.capture());
        assertThat(params.getValue()).containsEntry("materialId", 10L).containsEntry("customerId", 20L);
        service.clearIfCurrent(TENANT, null, 20L);
        verify(dao).deleteDefaultSupplier(anyMap());
    }

    @Test
    void clearOrphansReturnsClearedMaterialsAndSkipsEmptyInput() throws Exception {
        when(dao.deleteOrphanDefaultSuppliers(anyMap())).thenReturn(Arrays.asList(10L));
        assertThat(service.clearOrphans(TENANT, Arrays.asList(10L, 11L, null))).containsExactly(10L);
        assertThat(service.clearOrphans(TENANT, Collections.<Long>emptyList())).isEmpty();
        verify(dao).deleteOrphanDefaultSuppliers(anyMap());
    }

    @Test
    void findDefaultSupplierIdsMapsMaterialToCustomer() throws Exception {
        ItemPriceOverviewRowVO row = new ItemPriceOverviewRowVO();
        row.setMaterialId(10L);
        row.setCustomerId(20L);
        when(dao.selectDefaultSuppliers(anyMap())).thenReturn(Collections.singletonList(row));
        assertThat(service.findDefaultSupplierIds(TENANT, Arrays.asList(10L, 11L))).containsEntry(10L, 20L).hasSize(1);
        assertThat(service.findDefaultSupplierIds(TENANT, Collections.<Long>emptyList())).isEmpty();
    }

    @Test
    void findMaterialsMissingDefaultSupplierReturnsCodeAndNameLabels() throws Exception {
        ItemPriceOverviewRowVO row = new ItemPriceOverviewRowVO();
        row.setMaterialId(10L);
        row.setMaterialCode("A001");
        row.setMaterialName("밀가루");
        when(dao.selectMaterialsMissingDefaultSupplier(anyMap())).thenReturn(Collections.singletonList(row));

        assertThat(service.findMaterialsMissingDefaultSupplier(TENANT, Arrays.asList(10L, 11L, null)))
                .containsExactly("A001 밀가루");
        assertThat(service.findMaterialsMissingDefaultSupplier(TENANT, Collections.<Long>emptyList())).isEmpty();
        verify(dao).selectMaterialsMissingDefaultSupplier(anyMap());
    }

    @Test
    void findMaterialIdsByPriceIdsPassesTheTradeTypeFilter() throws Exception {
        when(dao.selectMaterialIdsByPriceIds(anyMap())).thenReturn(Arrays.asList(10L));
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();

        assertThat(service.findMaterialIdsByPriceIds(TENANT, Arrays.asList(1L), " 매입 ")).containsExactly(10L);

        verify(dao).selectMaterialIdsByPriceIds(params.capture());
        assertThat(params.getValue()).containsEntry("tradeType", "매입");
    }

    @Test
    void findMaterialIdsByPriceIdsHandlesEmptyResult() throws Exception {
        when(dao.selectMaterialIdsByPriceIds(anyMap())).thenReturn(null);
        List<Long> found = service.findMaterialIdsByPriceIds(TENANT, Arrays.asList(1L, 2L));
        assertThat(found).isEmpty();
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class) Map.class);
    }
}
