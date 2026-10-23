package egovframework.let.co.master.customer.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.customer.domain.model.CustomerInfoSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSearchCondition;
import egovframework.let.co.master.customer.domain.model.CustomerInfoVO;
import egovframework.let.co.master.customer.domain.repository.CustomerInfoDAO;

@ExtendWith(MockitoExtension.class)
class CustomerInfoServiceImplTest {

    @Mock
    private CustomerInfoDAO customerInfoDAO;

    @Mock
    private EgovIdGnrService customerCodeIdGnrService;

    private CustomerInfoServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CustomerInfoServiceImpl(customerInfoDAO, customerCodeIdGnrService);
    }

    @Test
    void listCustomersTrimsFiltersAndUsesAuthenticatedTenant() throws Exception {
        when(customerInfoDAO.selectCustomerList(anyMap()))
                .thenReturn(Collections.emptyList());
        CustomerInfoSearchCondition condition = new CustomerInfoSearchCondition();
        condition.setKeyword(" Acme ");
        condition.setPresidentName(" Lee ");
        condition.setBusinessNo(" 123 ");
        condition.setJuridNo(" 456 ");
        condition.setBusinessStatus1(" Retail ");
        condition.setBusinessItem1(" Goods ");
        condition.setUseAt(" Y ");

        service.listCustomers(9L, condition);

        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).selectCustomerList(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("keyword", "Acme")
                .containsEntry("presidentName", "Lee")
                .containsEntry("businessNo", "123")
                .containsEntry("juridNo", "456")
                .containsEntry("businessStatus1", "Retail")
                .containsEntry("businessItem1", "Goods")
                .containsEntry("useAt", "Y");
        assertThat(condition.getKeyword()).isEqualTo(" Acme ");
    }

    @Test
    void createCustomerRejectsBlankCustomerNameBeforeInsert() throws Exception {
        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("", "  ", "Y")))
                .isInstanceOf(IllegalArgumentException.class);

        verify(customerInfoDAO, never()).insertCustomer(anyMap());
    }

    @Test
    void createCustomerRejectsInvalidUseStatusBeforeInsert() throws Exception {
        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("", "Acme", "X")))
                .isInstanceOf(IllegalArgumentException.class);

        verify(customerInfoDAO, never()).insertCustomer(anyMap());
    }

    @Test
    void createCustomerRetainsSuppliedCodeWithoutCallingGenerator() throws Exception {
        stubInsertAndReload();

        service.createCustomer(9L, 101L, payload("MANUAL-A", "Acme", "Y"));

        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).insertCustomer(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("customerCode", "MANUAL-A")
                .containsEntry("customerName", "Acme");
        verify(customerCodeIdGnrService, never()).getNextStringId();
    }

    @Test
    void createCustomerUsesSixDigitEgovCodeWhenCodeIsBlank() throws Exception {
        when(customerCodeIdGnrService.getNextStringId()).thenReturn("000001");
        stubInsertAndReload();

        service.createCustomer(9L, 101L, payload("", "Acme", "Y"));

        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).insertCustomer(captured.capture());
        assertThat(captured.getValue()).containsEntry("customerCode", "000001");
        verify(customerCodeIdGnrService).getNextStringId();
    }

    @Test
    void createCustomerSkipsGeneratedCodeAlreadyUsedInTenant() throws Exception {
        stubInsertAndReload();
        when(customerCodeIdGnrService.getNextStringId()).thenReturn("000001", "000002");
        when(customerInfoDAO.selectCustomerIdByCode(anyMap()))
                .thenReturn(55L)
                .thenReturn(null);

        service.createCustomer(9L, 101L, payload("", "Acme", "Y"));

        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).insertCustomer(captured.capture());
        assertThat(captured.getValue()).containsEntry("customerCode", "000002");
        verify(customerCodeIdGnrService, org.mockito.Mockito.times(2)).getNextStringId();
    }

    @Test
    void createCustomerRejectsGeneratorOutputOutsideSixDigitRange() throws Exception {
        when(customerCodeIdGnrService.getNextStringId()).thenReturn("1000000");

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("", "Acme", "Y")))
                .isInstanceOf(IllegalArgumentException.class);

        verify(customerInfoDAO, never()).insertCustomer(anyMap());
    }

    @Test
    void createCustomerRejectsSuppliedDuplicateCodeWithinTenant() throws Exception {
        when(customerInfoDAO.selectCustomerIdByCode(anyMap())).thenReturn(55L);

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("MANUAL-A", "Acme", "Y")))
                .isInstanceOf(IllegalArgumentException.class);

        verify(customerInfoDAO, never()).insertCustomer(anyMap());
        verify(customerCodeIdGnrService, never()).getNextStringId();
    }

    @Test
    void createCustomerConvertsConcurrentUniqueCodeConflictToValidationError() throws Exception {
        when(customerInfoDAO.selectCustomerIdByCode(anyMap())).thenReturn(null);
        when(customerInfoDAO.insertCustomer(anyMap())).thenThrow(new DuplicateKeyException("duplicate key"));

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("MANUAL-A", "Acme", "Y")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미 사용 중");
    }

    @Test
    void updateCustomerRejectsMissingOrForeignTenantRow() throws Exception {
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(null);

        assertThatThrownBy(() ->
                service.updateCustomer(9L, 101L, 77L, payload("000077", "Acme", "Y")))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        verify(customerInfoDAO, never()).updateCustomer(anyMap());
    }

    @Test
    void postgresMapperRegistersCustomerStatementsAndScopesUpdatesToTenant() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/let/co/master/customer/CustomerInfo_SQL_postgresql.xml")) {
            assertThat(stream).isNotNull();
            new XMLMapperBuilder(
                    stream,
                    configuration,
                    "egovframework/mapper/let/co/master/customer/CustomerInfo_SQL_postgresql.xml",
                    configuration.getSqlFragments()).parse();
        }

        assertThat(configuration.hasStatement("CustomerInfoDAO.selectCustomerList")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.selectCustomerById")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.selectCustomerIdByCode")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.insertCustomer")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.updateCustomer")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("customerId", 77L);
        params.put("customerCode", "000077");
        params.put("customerName", "Acme");
        params.put("useAt", "Y");
        String updateSql = configuration.getMappedStatement("CustomerInfoDAO.updateCustomer")
                .getBoundSql(params).getSql();
        String updateAssignments = updateSql.substring(updateSql.indexOf("SET"), updateSql.indexOf("WHERE"));
        assertThat(updateSql).contains("tenant_id = ?");
        assertThat(updateAssignments).doesNotContain("customer_id", "tenant_id");
    }

    private void stubInsertAndReload() throws Exception {
        when(customerInfoDAO.selectCustomerIdByCode(anyMap())).thenReturn(null);
        when(customerInfoDAO.insertCustomer(anyMap())).thenReturn(31L);
        CustomerInfoVO saved = new CustomerInfoVO();
        saved.setCustomerId(31L);
        saved.setTenantId(9L);
        saved.setCustomerCode("000001");
        saved.setCustomerName("Acme");
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(saved);
    }

    private CustomerInfoSaveRequestVO payload(String code, String name, String useAt) {
        CustomerInfoSaveRequestVO payload = new CustomerInfoSaveRequestVO();
        payload.setCustomerCode(code);
        payload.setCustomerName(name);
        payload.setUseAt(useAt);
        return payload;
    }
}
