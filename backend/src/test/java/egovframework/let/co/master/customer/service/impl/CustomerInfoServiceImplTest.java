package egovframework.let.co.master.customer.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;
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
    void setUp() throws Exception {
        service = new CustomerInfoServiceImpl(customerInfoDAO, customerCodeIdGnrService);
        org.mockito.Mockito.lenient().when(customerInfoDAO.selectCustomerIdByName(anyMap())).thenReturn(null);
        org.mockito.Mockito.lenient().when(customerInfoDAO.selectCustomerIdByCode(anyMap())).thenReturn(null);
        org.mockito.Mockito.lenient().when(customerInfoDAO.selectCustomerIdByBusinessNo(anyMap())).thenReturn(null);
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
    void createCustomerConvertsConcurrentUniqueNameConflictToNameError() throws Exception {
        PSQLException cause = new PSQLException(new ServerErrorMessage(
                "SERROR\0C23505\0Mduplicate key\0nuq_tb_customer_info_tenant_name\0\0"));
        when(customerInfoDAO.insertCustomer(anyMap()))
                .thenThrow(new DuplicateKeyException("duplicate key", cause));

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("MANUAL-A", "Acme", "Y")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 거래처명입니다.");
    }

    @Test
    void insertAndUpdateClassifyConcurrentBusinessNumberConflicts() throws Exception {
        PSQLException cause = new PSQLException(new ServerErrorMessage(
                "SERROR\0C23505\0Mduplicate key\0nuq_tb_customer_info_tenant_business_no\0\0"));
        when(customerInfoDAO.insertCustomer(anyMap()))
                .thenThrow(new DuplicateKeyException("duplicate key", cause));
        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("MANUAL-A", "Acme", "Y")))
                .hasMessage("이미 사용 중인 사업자번호입니다.");
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        when(customerInfoDAO.updateCustomer(anyMap()))
                .thenThrow(new DuplicateKeyException("duplicate key", cause));
        assertThatThrownBy(() -> service.updateCustomer(9L, 101L, 77L, payload("000077", "Acme", "N")))
                .hasMessage("이미 사용 중인 사업자번호입니다.");
    }

    @Test
    void createCustomerRejectsTrimmedDuplicateNameBeforeGeneratingCode() throws Exception {
        when(customerInfoDAO.selectCustomerIdByName(anyMap())).thenReturn(55L);

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, payload("", " Acme ", "Y")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 거래처명입니다.");

        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).selectCustomerIdByName(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("customerName", "Acme")
                .containsEntry("excludeCustomerId", null);
        verify(customerInfoDAO, never()).insertCustomer(anyMap());
        verify(customerCodeIdGnrService, never()).getNextStringId();
    }

    @Test
    void createCustomerRejectsNormalizedBusinessNumberBeforeGeneratingCode() throws Exception {
        CustomerInfoSaveRequestVO request = payload("", "Acme", "Y");
        request.setBusinessNo(" 012-34 56789 ");
        when(customerInfoDAO.selectCustomerIdByBusinessNo(anyMap())).thenReturn(55L);

        assertThatThrownBy(() -> service.createCustomer(9L, 101L, request))
                .hasMessage("이미 사용 중인 사업자번호입니다.");
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).selectCustomerIdByBusinessNo(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("businessNo", "0123456789")
                .containsEntry("excludeCustomerId", null);
        verify(customerCodeIdGnrService, never()).getNextStringId();
        verify(customerInfoDAO, never()).insertCustomer(anyMap());
    }

    @Test
    void updateCustomerRejectsOtherBusinessNumberAndExcludesItsOwnId() throws Exception {
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        when(customerInfoDAO.selectCustomerIdByBusinessNo(anyMap())).thenReturn(55L);
        CustomerInfoSaveRequestVO request = payload("000077", "Acme", "N");
        request.setBusinessNo("012-34-56789");

        assertThatThrownBy(() -> service.updateCustomer(9L, 101L, 77L, request))
                .hasMessage("이미 사용 중인 사업자번호입니다.");
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).selectCustomerIdByBusinessNo(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("businessNo", "0123456789")
                .containsEntry("excludeCustomerId", 77L);
        verify(customerInfoDAO, never()).updateCustomer(anyMap());
    }

    @Test
    void updateCustomerPreservesBusinessNumberFormattingWhenNoOtherRowMatches() throws Exception {
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        when(customerInfoDAO.updateCustomer(anyMap())).thenReturn(1);
        CustomerInfoSaveRequestVO request = payload("000077", "Acme", "N");
        request.setBusinessNo(" 012-34-56789 ");

        service.updateCustomer(9L, 101L, 77L, request);

        verify(customerInfoDAO).selectCustomerIdByBusinessNo(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(77L).equals(params.get("excludeCustomerId"))
                        && "0123456789".equals(params.get("businessNo"))));
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).updateCustomer(captured.capture());
        assertThat(captured.getValue()).containsEntry("businessNo", "012-34-56789");
        assertThat(request.getBusinessNo()).isEqualTo(" 012-34-56789 ");
    }

    @Test
    void createCustomerKeepsOptionalEmptyBusinessNumberContract() throws Exception {
        stubInsertAndReload();
        for (String value : new String[] { null, "", " ", "---" }) {
            CustomerInfoSaveRequestVO request = payload("MANUAL-A", "Acme", "Y");
            request.setBusinessNo(value);
            service.createCustomer(9L, 101L, request);
        }
        verify(customerInfoDAO, never()).selectCustomerIdByBusinessNo(anyMap());
    }

    @Test
    void updateCustomerChecksNameWithinTenantExcludingCurrentId() throws Exception {
        CustomerInfoVO current = new CustomerInfoVO();
        current.setCustomerId(77L);
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(current);
        when(customerInfoDAO.selectCustomerIdByName(anyMap())).thenReturn(55L);

        assertThatThrownBy(() -> service.updateCustomer(9L, 101L, 77L, payload("000077", " Acme ", "N")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 거래처명입니다.");
        ArgumentCaptor<Map<String, Object>> captured = ArgumentCaptor.forClass(Map.class);
        verify(customerInfoDAO).selectCustomerIdByName(captured.capture());
        assertThat(captured.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("customerName", "Acme")
                .containsEntry("excludeCustomerId", 77L);
        verify(customerInfoDAO, never()).updateCustomer(anyMap());
    }

    @Test
    void updateCustomerKeepsItsOwnNameWhenNoOtherRowMatches() throws Exception {
        CustomerInfoVO current = new CustomerInfoVO();
        current.setCustomerId(77L);
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(current);
        when(customerInfoDAO.updateCustomer(anyMap())).thenReturn(1);

        assertThat(service.updateCustomer(9L, 101L, 77L, payload("000077", " Acme ", "N")))
                .isSameAs(current);
        verify(customerInfoDAO).selectCustomerIdByName(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(77L).equals(params.get("excludeCustomerId"))));
    }

    @Test
    void updateCustomerConvertsConcurrentNameConflictToNameError() throws Exception {
        when(customerInfoDAO.selectCustomerById(anyMap())).thenReturn(new CustomerInfoVO());
        PSQLException cause = new PSQLException(new ServerErrorMessage(
                "SERROR\0C23505\0Mduplicate key\0nuq_tb_customer_info_tenant_name\0\0"));
        when(customerInfoDAO.updateCustomer(anyMap()))
                .thenThrow(new DuplicateKeyException("duplicate key", cause));

        assertThatThrownBy(() -> service.updateCustomer(9L, 101L, 77L, payload("000077", "Acme", "Y")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 거래처명입니다.");
    }

    @Test
    void migrationCopiesMatchAndGuardExistingDuplicatesWithoutChangingData() throws Exception {
        Path backendDirectory = Paths.get("DATABASE", "20261023");
        Path docsDirectory = Paths.get("..", "docs", "database", "20261023");
        for (String file : new String[] {
                "20261023_001_customer_name_unique.sql",
                "20261023_001_change_customer_name_unique.md",
                "20261023_001_rollback.sql" }) {
            assertThat(Files.readAllBytes(backendDirectory.resolve(file)))
                    .isEqualTo(Files.readAllBytes(docsDirectory.resolve(file)));
        }
        String sql = new String(Files.readAllBytes(
                backendDirectory.resolve("20261023_001_customer_name_unique.sql")), StandardCharsets.UTF_8);
        assertThat(sql).contains("BEGIN;", "LOCK TABLE", "HAVING COUNT(*) > 1", "RAISE EXCEPTION",
                "CREATE UNIQUE INDEX uq_tb_customer_info_tenant_name",
                "(tenant_id, btrim(customer_name))", "COMMIT;")
                .doesNotContain("DELETE FROM", "UPDATE public.tb_customer_info", "use_at");
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
    void businessNumberMigrationCopiesMatchAndOnlyConstrainNonemptyDigitKeys() throws Exception {
        Path backendDirectory = Paths.get("DATABASE", "20261023");
        Path docsDirectory = Paths.get("..", "docs", "database", "20261023");
        for (String file : new String[] {
                "20261023_002_customer_business_no_unique.sql",
                "20261023_002_change_customer_business_no_unique.md",
                "20261023_002_rollback.sql" }) {
            assertThat(Files.readAllBytes(backendDirectory.resolve(file)))
                    .isEqualTo(Files.readAllBytes(docsDirectory.resolve(file)));
        }
        String sql = new String(Files.readAllBytes(
                backendDirectory.resolve("20261023_002_customer_business_no_unique.sql")), StandardCharsets.UTF_8);
        assertThat(sql).contains("BEGIN;", "LOCK TABLE", "HAVING COUNT(*) > 1", "RAISE EXCEPTION",
                "CREATE UNIQUE INDEX uq_tb_customer_info_tenant_business_no",
                "(tenant_id, regexp_replace(business_no, '[^0-9]', '', 'g'))",
                "WHERE regexp_replace(business_no, '[^0-9]', '', 'g') <> ''", "COMMIT;")
                .doesNotContain("DELETE FROM", "UPDATE public.tb_customer_info", "use_at");
        String rollback = new String(Files.readAllBytes(
                backendDirectory.resolve("20261023_002_rollback.sql")), StandardCharsets.UTF_8);
        assertThat(rollback).contains("DROP INDEX IF EXISTS public.uq_tb_customer_info_tenant_business_no")
                .doesNotContain("tenant_name", "DROP TABLE", "DELETE FROM");
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
        assertThat(configuration.hasStatement("CustomerInfoDAO.selectCustomerIdByName")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.selectCustomerIdByBusinessNo")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.insertCustomer")).isTrue();
        assertThat(configuration.hasStatement("CustomerInfoDAO.updateCustomer")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 9L);
        params.put("customerId", 77L);
        params.put("customerCode", "000077");
        params.put("customerName", "Acme");
        params.put("useAt", "Y");
        params.put("excludeCustomerId", 77L);
        String nameSql = configuration.getMappedStatement("CustomerInfoDAO.selectCustomerIdByName")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(nameSql).contains("tenant_id = ?", "btrim(customer_name) = ?", "customer_id != ?")
                .doesNotContain("use_at");
        String businessSql = configuration.getMappedStatement("CustomerInfoDAO.selectCustomerIdByBusinessNo")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(businessSql).contains("tenant_id = ?",
                "regexp_replace(business_no, '[^0-9]', '', 'g') = ?", "customer_id != ?")
                .doesNotContain("use_at");
        params.remove("excludeCustomerId");
        assertThat(configuration.getMappedStatement("CustomerInfoDAO.selectCustomerIdByName")
                .getBoundSql(params).getSql()).doesNotContain("customer_id !=");
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
