package egovframework.let.co.master.customer.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.util.Collections;
import java.util.Arrays;
import javax.sql.DataSource;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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
import egovframework.let.co.master.customer.domain.repository.CustomerInfoDAO;
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
        assertThat(result.getRowIdMappings()).containsEntry("12", 12L);
        assertThat(result.getRowIdMappings()).containsValue(31L);
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
    void rejectsDuplicateRequestIdsBeforeWriting() {
        CustomerInfoBatchSaveRequestVO request = batch();
        request.getCustomers().getInsertedRows().get(0).setCustomerId("12");
        assertThatThrownBy(() -> service.saveBatch(9L, 101L, request)).hasMessageContaining("중복");
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

    @Test
    void saveBatchRollsBackWhenSecondInsertDuplicatesFirstName() throws Exception {
        CustomerInfoDAO dao = mock(CustomerInfoDAO.class);
        EgovIdGnrService generator = mock(EgovIdGnrService.class);
        when(dao.selectCustomerIdByName(anyMap())).thenReturn(null, 31L);
        when(dao.selectCustomerIdByCode(anyMap())).thenReturn(null);
        when(dao.insertCustomer(anyMap())).thenReturn(31L);
        when(dao.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        when(generator.getNextStringId()).thenReturn("000031");
        service = new CustomerInfoBatchServiceImpl(new CustomerInfoServiceImpl(dao, generator,
                new egovframework.let.co.master.classification.service.ClassificationSelectionValidator(
                        org.mockito.Mockito.mock(egovframework.let.co.master.classification.domain.repository.ClassificationDAO.class))));
        CustomerInfoBatchSaveRequestVO payload = batch();
        payload.getCustomers().setInsertedRows(Arrays.asList(
                row("new-1", ""), row("new-2", "")));
        payload.getCustomers().setUpdatedRows(Collections.emptyList());

        CustomerInfoBatchService transactional = transactionalService();
        assertThatThrownBy(() -> transactional.saveBatch(9L, 101L, payload))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 거래처명입니다.");

        verify(dao, times(1)).insertCustomer(anyMap());
        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    @Test
    void saveBatchRollsBackWhenSecondInsertDuplicatesNormalizedBusinessNumber() throws Exception {
        CustomerInfoDAO dao = mock(CustomerInfoDAO.class);
        EgovIdGnrService generator = mock(EgovIdGnrService.class);
        when(dao.selectCustomerIdByName(anyMap())).thenReturn(null);
        when(dao.selectCustomerIdByCode(anyMap())).thenReturn(null);
        when(dao.selectCustomerIdByBusinessNo(anyMap())).thenReturn(null, 31L);
        when(dao.insertCustomer(anyMap())).thenReturn(31L);
        when(dao.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        when(generator.getNextStringId()).thenReturn("000031");
        service = new CustomerInfoBatchServiceImpl(new CustomerInfoServiceImpl(dao, generator,
                new egovframework.let.co.master.classification.service.ClassificationSelectionValidator(
                        org.mockito.Mockito.mock(egovframework.let.co.master.classification.domain.repository.ClassificationDAO.class))));
        CustomerInfoChangeVO first = row("new-1", "");
        first.setCustomerName("First");
        first.setBusinessNo("012-34-56789");
        CustomerInfoChangeVO second = row("new-2", "");
        second.setCustomerName("Second");
        second.setBusinessNo("0123456789");
        CustomerInfoBatchSaveRequestVO payload = batch();
        payload.getCustomers().setInsertedRows(Arrays.asList(first, second));
        payload.getCustomers().setUpdatedRows(Collections.emptyList());

        assertThatThrownBy(() -> transactionalService().saveBatch(9L, 101L, payload))
                .hasMessage("이미 사용 중인 사업자번호입니다.");
        verify(dao, times(1)).insertCustomer(anyMap());
        verify(dao, times(2)).selectCustomerIdByBusinessNo(
                org.mockito.ArgumentMatchers.argThat(params -> "0123456789".equals(params.get("businessNo"))));
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
