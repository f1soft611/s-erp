package egovframework.let.co.master.customer.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.util.Collections;
import javax.sql.DataSource;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchChangeSetVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoBatchSaveResultVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoChangeVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.service.CustomerInfoBatchService;
import egovframework.let.co.master.customer.service.CustomerInfoService;

@ExtendWith(MockitoExtension.class)
class CustomerInfoBatchServiceImplTest {

    @Mock
    private CustomerInfoService customerInfoService;
    @Mock
    private DataSource dataSource;
    @Mock
    private Connection connection;

    private CustomerInfoBatchServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CustomerInfoBatchServiceImpl(customerInfoService);
    }

    @Test
    void saveBatchReusesCustomerServiceForInsertedAndUpdatedRows() throws Exception {
        CustomerInfoVO created = new CustomerInfoVO();
        created.setCustomerId(31L);
        CustomerInfoVO updated = new CustomerInfoVO();
        updated.setCustomerId(12L);
        when(customerInfoService.createCustomer(eq(9L), eq(101L), any())).thenReturn(created);
        when(customerInfoService.updateCustomer(eq(9L), eq(101L), eq(12L), any())).thenReturn(updated);

        CustomerInfoBatchSaveResultVO result = service.saveBatch(9L, 101L, batch());

        assertThat(result.getCustomers()).containsExactly(created, updated);
        verify(customerInfoService).createCustomer(eq(9L), eq(101L),
                org.mockito.ArgumentMatchers.argThat(row -> "".equals(row.getCustomerCode())));
        verify(customerInfoService).updateCustomer(eq(9L), eq(101L), eq(12L),
                org.mockito.ArgumentMatchers.argThat(row -> "000012".equals(row.getCustomerCode())));
    }

    @Test
    void saveBatchRejectsPhysicalDeletesBeforeWritingAnyRows() throws Exception {
        CustomerInfoBatchSaveRequestVO payload = batch();
        payload.getCustomers().setDeletedRows(Collections.singletonList(row("12", "000012")));

        assertThatThrownBy(() -> service.saveBatch(9L, 101L, payload))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("삭제");
        verifyNoInteractions(customerInfoService);
    }

    @Test
    void saveBatchRejectsInvalidUpdateIdsAndMissingCodesBeforeWriting() throws Exception {
        CustomerInfoBatchSaveRequestVO payload = batch();
        payload.getCustomers().getUpdatedRows().get(0).setCustomerId("new-customer");
        assertThatThrownBy(() -> service.saveBatch(9L, 101L, payload))
                .isInstanceOf(IllegalArgumentException.class);

        payload.getCustomers().getUpdatedRows().get(0).setCustomerId("12");
        payload.getCustomers().getUpdatedRows().get(0).setCustomerCode("");
        assertThatThrownBy(() -> service.saveBatch(9L, 101L, payload))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(customerInfoService);
    }

    @Test
    void saveBatchRejectsNullRequestOrRows() throws Exception {
        assertThatThrownBy(() -> service.saveBatch(9L, 101L, null))
                .isInstanceOf(IllegalArgumentException.class);
        CustomerInfoBatchSaveRequestVO payload = batch();
        payload.getCustomers().setInsertedRows(Collections.singletonList(null));
        assertThatThrownBy(() -> service.saveBatch(9L, 101L, payload))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(customerInfoService);
    }

    @Test
    void saveBatchCommitsOnceAfterAllRowsSucceed() throws Exception {
        when(customerInfoService.createCustomer(eq(9L), eq(101L), any())).thenReturn(new CustomerInfoVO());
        when(customerInfoService.updateCustomer(eq(9L), eq(101L), eq(12L), any()))
                .thenReturn(new CustomerInfoVO());

        transactionalService().saveBatch(9L, 101L, batch());

        verify(connection).commit();
        verify(connection, never()).rollback();
    }

    @Test
    void saveBatchRollsBackEarlierRowsWhenLaterRowThrowsCheckedException() throws Exception {
        when(customerInfoService.createCustomer(eq(9L), eq(101L), any())).thenReturn(new CustomerInfoVO());
        when(customerInfoService.updateCustomer(eq(9L), eq(101L), eq(12L), any()))
                .thenThrow(new Exception("update failed"));

        CustomerInfoBatchService transactional = transactionalService();
        assertThatThrownBy(() -> transactional.saveBatch(9L, 101L, batch()))
                .hasMessage("update failed");

        verify(customerInfoService).createCustomer(eq(9L), eq(101L), any());
        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    private CustomerInfoBatchService transactionalService() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getAutoCommit()).thenReturn(true);
        ProxyFactory factory = new ProxyFactory(service);
        factory.addAdvice(new TransactionInterceptor(
                new DataSourceTransactionManager(dataSource),
                new AnnotationTransactionAttributeSource()));
        return (CustomerInfoBatchService) factory.getProxy();
    }

    private CustomerInfoBatchSaveRequestVO batch() {
        CustomerInfoBatchChangeSetVO changes = new CustomerInfoBatchChangeSetVO();
        changes.setInsertedRows(Collections.singletonList(row("new-customer", "")));
        changes.setUpdatedRows(Collections.singletonList(row("12", "000012")));
        CustomerInfoBatchSaveRequestVO payload = new CustomerInfoBatchSaveRequestVO();
        payload.setCustomers(changes);
        return payload;
    }

    private CustomerInfoChangeVO row(String id, String code) {
        CustomerInfoChangeVO row = new CustomerInfoChangeVO();
        row.setCustomerId(id);
        row.setCustomerCode(code);
        row.setCustomerName("Acme");
        row.setUseAt("Y");
        return row;
    }
}
