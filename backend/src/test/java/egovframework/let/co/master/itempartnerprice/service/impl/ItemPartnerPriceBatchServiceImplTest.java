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
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

class ItemPartnerPriceBatchServiceImplTest {
    private final ItemPartnerPriceService service = mock(ItemPartnerPriceService.class);
    private final ItemPartnerPriceBatchServiceImpl batch = new ItemPartnerPriceBatchServiceImpl(service);

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
        request.getPrices().setDeletedRows(request.getPrices().getInsertedRows());
        assertThatThrownBy(() -> batch.saveBatch(9L, "101", request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("삭제");
        request.getPrices().setDeletedRows(Collections.emptyList());
        ItemPartnerPriceChangeVO repeated = row("new-price-2");
        request.getPrices().setInsertedRows(Arrays.asList(request.getPrices().getInsertedRows().get(0), repeated));

        assertThatThrownBy(() -> batch.saveBatch(9L, "101", request))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("중복");
        verifyNoInteractions(service);
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
