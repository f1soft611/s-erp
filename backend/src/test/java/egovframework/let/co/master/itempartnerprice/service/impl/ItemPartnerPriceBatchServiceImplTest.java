package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.Arrays;
import java.util.Collections;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchChangeSetVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveResultVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceChangeVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.service.ItemDefaultSupplierService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

class ItemPartnerPriceBatchServiceImplTest {
    private final ItemPartnerPriceService service = mock(ItemPartnerPriceService.class);
    private final ItemDefaultSupplierService defaultSuppliers = mock(ItemDefaultSupplierService.class);
    private final ItemPartnerPriceBatchServiceImpl batch = new ItemPartnerPriceBatchServiceImpl(service, defaultSuppliers);

    @Test
    void savesInsertedAndUpdatedRowsWithServerIdMappings() throws Exception {
        ItemPartnerPriceVO inserted = new ItemPartnerPriceVO();
        inserted.setPriceId(44L);
        ItemPartnerPriceVO updated = new ItemPartnerPriceVO();
        updated.setPriceId(12L);
        when(service.createPrice(eq(9L), eq("101"), any())).thenReturn(inserted);
        when(service.updatePrice(eq(9L), eq("101"), eq(12L), any())).thenReturn(updated);

        ItemPartnerPriceBatchSaveResultVO result = batch.saveBatch(9L, "101", request());

        assertThat(result.getPrices()).containsExactly(inserted, updated);
        assertThat(result.getRowIdMappings()).containsEntry("new-price-1", 44L).containsEntry("12", 12L);
    }

    @Test
    void rejectsDeletedRowsAndDuplicateRequestBusinessKeysBeforeWriting() {
        ItemPartnerPriceBatchSaveRequestVO request = request();
        ItemPartnerPriceChangeVO sameAsUpdated = new ItemPartnerPriceChangeVO();
        sameAsUpdated.setPriceId("12");
        request.getPrices().setDeletedRows(Collections.singletonList(sameAsUpdated));
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("삭제");
        ItemPartnerPriceChangeVO deleted = new ItemPartnerPriceChangeVO();
        deleted.setPriceId("77");
        request.getPrices().setDeletedRows(Arrays.asList(deleted, deleted));
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("중복");
        request.getPrices().setDeletedRows(Collections.emptyList());
        ItemPartnerPriceChangeVO repeated = row("new-price-2");
        request.getPrices().setInsertedRows(Arrays.asList(request.getPrices().getInsertedRows().get(0), repeated));

        assertThatThrownBy(() -> batch.saveBatch(9L, "101", request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("중복");
        verifyNoInteractions(service);
    }

    @Test
    void deletesFirstThenUpdatesThenInserts() throws Exception {
        ItemPartnerPriceVO inserted = new ItemPartnerPriceVO();
        inserted.setPriceId(44L);
        ItemPartnerPriceVO updated = new ItemPartnerPriceVO();
        updated.setPriceId(12L);
        when(service.createPrice(eq(9L), eq("101"), any())).thenReturn(inserted);
        when(service.updatePrice(eq(9L), eq("101"), eq(12L), any())).thenReturn(updated);
        ItemPartnerPriceBatchSaveRequestVO request = request();
        ItemPartnerPriceChangeVO deleted = new ItemPartnerPriceChangeVO();
        deleted.setPriceId("77");
        request.getPrices().setDeletedRows(Collections.singletonList(deleted));

        batch.saveBatch(9L, "101", request);

        org.mockito.InOrder order = inOrder(service);
        order.verify(service).deletePrice(9L, "101", 77L);
        order.verify(service).updatePrice(eq(9L), eq("101"), eq(12L), any());
        order.verify(service).createPrice(eq(9L), eq("101"), any());
    }

    @Test
    void acceptsADeleteOnlyRequest() throws Exception {
        ItemPartnerPriceBatchSaveRequestVO request = new ItemPartnerPriceBatchSaveRequestVO();
        ItemPartnerPriceBatchChangeSetVO changes = new ItemPartnerPriceBatchChangeSetVO();
        ItemPartnerPriceChangeVO deleted = new ItemPartnerPriceChangeVO();
        deleted.setPriceId("77");
        changes.setInsertedRows(Collections.emptyList());
        changes.setUpdatedRows(Collections.emptyList());
        changes.setDeletedRows(Collections.singletonList(deleted));
        request.setPrices(changes);

        batch.saveBatch(9L, "101", request);

        verify(service).deletePrice(9L, "101", 77L);
    }

    @Test
    void rollsBackWhenAnyChangeFails() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getAutoCommit()).thenReturn(true);
        when(service.createPrice(eq(9L), eq("101"), any())).thenReturn(new ItemPartnerPriceVO());
        when(service.updatePrice(eq(9L), eq("101"), eq(12L), any()))
                .thenThrow(new Exception("update failed"));
        ProxyFactory factory = new ProxyFactory(batch);
        factory.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(dataSource),
                new AnnotationTransactionAttributeSource()));
        ItemPartnerPriceBatchService transactional =
                (ItemPartnerPriceBatchService) factory.getProxy();

        assertThatThrownBy(() -> transactional.saveBatch(9L, "101", request()))
                .hasMessage("update failed");

        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    @Test
    void setsDefaultSupplierAfterPriceRowsAndReportsClearedOrphans() throws Exception {
        ItemPartnerPriceVO inserted = new ItemPartnerPriceVO();
        inserted.setPriceId(44L);
        inserted.setMaterialId(101L);
        inserted.setCustomerId(201L);
        inserted.setTradeType("매입");
        ItemPartnerPriceVO updated = new ItemPartnerPriceVO();
        updated.setPriceId(12L);
        updated.setMaterialId(101L);
        updated.setCustomerId(202L);
        updated.setTradeType("매입");
        when(service.createPrice(eq(9L), eq("101"), any())).thenReturn(inserted);
        when(service.updatePrice(eq(9L), eq("101"), eq(12L), any())).thenReturn(updated);
        when(defaultSuppliers.findMaterialIdsByPriceIds(eq(9L), any())).thenReturn(Collections.singletonList(300L));
        when(defaultSuppliers.clearOrphans(eq(9L), any())).thenReturn(Collections.singletonList(300L));
        when(defaultSuppliers.findDefaultSupplierIds(eq(9L), any())).thenReturn(Collections.singletonMap(101L, 201L));
        ItemPartnerPriceBatchSaveRequestVO request = request();
        request.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);

        ItemPartnerPriceBatchSaveResultVO result = batch.saveBatch(9L, "101", request);

        org.mockito.InOrder order = inOrder(service, defaultSuppliers);
        order.verify(service).createPrice(eq(9L), eq("101"), any());
        order.verify(defaultSuppliers).setDefault(9L, "101", 101L, 201L);
        order.verify(defaultSuppliers).clearOrphans(eq(9L), any());
        assertThat(result.getClearedDefaultMaterialIds()).containsExactly(300L);
        assertThat(inserted.getDefaultSupplier()).isTrue();
        assertThat(updated.getDefaultSupplier()).isFalse();
    }

    @Test
    void falseFlagClearsOnlyWhenNoOtherSupplierIsBeingSet() throws Exception {
        when(service.createPrice(eq(9L), eq("101"), any())).thenReturn(new ItemPartnerPriceVO());
        when(service.updatePrice(eq(9L), eq("101"), eq(12L), any())).thenReturn(new ItemPartnerPriceVO());
        ItemPartnerPriceBatchSaveRequestVO request = request();
        request.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        request.getPrices().getUpdatedRows().get(0).setMaterialId(101L);
        request.getPrices().getUpdatedRows().get(0).setDefaultSupplier(Boolean.FALSE);

        batch.saveBatch(9L, "101", request);

        verify(defaultSuppliers).setDefault(9L, "101", 101L, 201L);
        verify(defaultSuppliers, never()).clearIfCurrent(anyLong(), anyLong(), anyLong());

        ItemPartnerPriceBatchSaveRequestVO clearOnly = request();
        clearOnly.getPrices().getUpdatedRows().get(0).setMaterialId(101L);
        clearOnly.getPrices().getUpdatedRows().get(0).setDefaultSupplier(Boolean.FALSE);
        batch.saveBatch(9L, "101", clearOnly);
        verify(defaultSuppliers).clearIfCurrent(9L, 101L, 202L);
    }

    @Test
    void rejectsInvalidDefaultSupplierRequestsBeforeWriting() {
        ItemPartnerPriceBatchSaveRequestVO common = request();
        common.getPrices().getInsertedRows().get(0).setCustomerId(null);
        common.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", common))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("기본 거래처");

        ItemPartnerPriceBatchSaveRequestVO sales = request();
        sales.getPrices().getInsertedRows().get(0).setTradeType("매출");
        sales.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", sales))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("기본 거래처");

        ItemPartnerPriceBatchSaveRequestVO inactive = request();
        inactive.getPrices().getInsertedRows().get(0).setUseAt("N");
        inactive.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", inactive))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("기본 거래처");

        ItemPartnerPriceBatchSaveRequestVO two = request();
        two.getPrices().getInsertedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        two.getPrices().getUpdatedRows().get(0).setMaterialId(101L);
        two.getPrices().getUpdatedRows().get(0).setDefaultSupplier(Boolean.TRUE);
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", two))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("하나");
        verifyNoInteractions(service);
    }

    private ItemPartnerPriceBatchSaveRequestVO request() {
        ItemPartnerPriceChangeVO inserted = row("new-price-1");
        ItemPartnerPriceChangeVO updated = row("12");
        updated.setPriceId("12");
        updated.setCustomerId(202L);
        ItemPartnerPriceBatchChangeSetVO changes = new ItemPartnerPriceBatchChangeSetVO();
        changes.setInsertedRows(Collections.singletonList(inserted));
        changes.setUpdatedRows(Collections.singletonList(updated));
        changes.setDeletedRows(Collections.emptyList());
        ItemPartnerPriceBatchSaveRequestVO request = new ItemPartnerPriceBatchSaveRequestVO();
        request.setPrices(changes);
        return request;
    }

    private ItemPartnerPriceChangeVO row(String id) {
        ItemPartnerPriceChangeVO row = new ItemPartnerPriceChangeVO();
        row.setPriceId(id);
        row.setMaterialId(101L);
        row.setCustomerId(201L);
        row.setTradeType("매입");
        row.setUnitPrice(new BigDecimal("1250.50"));
        row.setCurrency("KRW");
        row.setStartDt("2026-10-01");
        row.setUseAt("Y");
        return row;
    }
}
