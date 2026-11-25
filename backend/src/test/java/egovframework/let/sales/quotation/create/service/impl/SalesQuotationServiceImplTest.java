package egovframework.let.sales.quotation.create.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.quotation.create.domain.model.*;
import egovframework.let.sales.quotation.create.domain.repository.SalesQuotationDAO;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.com.cmm.DecimalColumnContract;

class SalesQuotationServiceImplTest {
    private SalesQuotationDAO dao;
    private IdSequenceService sequence;
    private SystemPolicyService policy;
    private SalesQuotationServiceImpl service;

    @BeforeEach
    void setup() throws Exception {
        dao = mock(SalesQuotationDAO.class);
        sequence = mock(IdSequenceService.class);
        policy = mock(SystemPolicyService.class);
        service = new SalesQuotationServiceImpl(dao, sequence, policy);
        Map<String, Object> legacy = new java.util.HashMap<>();
        legacy.put("places", 2);
        legacy.put("rounding", "HALF_UP");
        when(policy.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", legacy));
        when(dao.existsCustomer(anyMap())).thenReturn(true);
        when(dao.existsMaterial(anyMap())).thenReturn(true);
        when(dao.insertHeader(anyMap())).thenReturn(300L);
        when(dao.insertDetail(anyMap())).thenReturn(400L);
        when(sequence.nextValue("SALES_QUOTATION_NO", "71", "20261116")).thenReturn(1L);
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "SALES_DECIMAL_COLUMN_FIXTURE", matches = "true")
    void calculatesQuotationWithSharedColumnFixture() throws Exception {
        Map<String, Object> rule = new java.util.HashMap<>();
        rule.put("places", 3);
        rule.put("rounding", "DOWN");
        when(policy.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", rule));
        SalesQuotationCreateRequestVO payload = request();
        payload.setDecimalColumns(DecimalColumnContract.forDocument("sales.quotation"));
        payload.setDetails(Arrays.asList(line(null, "direct", "1", "1.235"), line(null, "direct", "1", "1.235")));
        SalesQuotationVO result = service.createQuotation(71L, "writer", payload);
        assertThat(result.getDetails().get(0).getLineAmt()).isEqualByComparingTo("1.235");
        assertThat(result.getSupplyAmt()).isEqualByComparingTo("2.47");
        assertThat(result.getVatAmt()).isEqualByComparingTo("0.2");
        assertThat(result.getTotalAmt()).isEqualByComparingTo("2.670");
        verify(dao, times(2)).insertDetail(argThat(params ->
                new BigDecimal("1.235").compareTo((BigDecimal) params.get("lineAmt")) == 0));
    }

    @Test
    void rejectsStaleDecimalPolicyBeforePersisting() throws Exception {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        ObjectNode json = mapper.valueToTree(request());
        json.set("decimalPolicy", mapper.readTree("{\"places\":3,\"rounding\":\"DOWN\"}"));
        SalesQuotationCreateRequestVO payload = mapper.treeToValue(json, SalesQuotationCreateRequestVO.class);

        assertThatThrownBy(() -> service.createQuotation(71L, "writer", payload))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void rejectsMismatchedColumnContract() throws Exception {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        ObjectNode json = mapper.valueToTree(request());
        json.set("decimalColumns", mapper.readTree("{\"unitPrice\":{\"type\":\"decimal\",\"places\":6}}"));
        SalesQuotationCreateRequestVO payload = mapper.treeToValue(json, SalesQuotationCreateRequestVO.class);
        assertThatThrownBy(() -> service.createQuotation(71L, "writer", payload))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus()).isEqualTo(HttpStatus.CONFLICT);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void acceptsMatchingTypedSnapshot() throws Exception {
        Map<String, Object> legacyRule = new java.util.HashMap<>();
        legacyRule.put("places", 2);
        legacyRule.put("rounding", "HALF_UP");
        Map<String, Object> snapshot = new java.util.HashMap<>();
        snapshot.put("number", legacyRule);
        snapshot.put("decimal", legacyRule);
        snapshot.put("currency", legacyRule);
        SalesQuotationCreateRequestVO payload = request();
        payload.setDecimalPolicy(snapshot);
        assertThat(service.createQuotation(71L, "writer", payload)).isNotNull();
    }

    @Test
    void rejectsTypedSnapshotWithoutCurrencyRule() throws Exception {
        Map<String, Object> legacyRule = new java.util.HashMap<>();
        legacyRule.put("places", 2);
        legacyRule.put("rounding", "HALF_UP");
        Map<String, Object> snapshot = new java.util.HashMap<>();
        snapshot.put("number", legacyRule);
        snapshot.put("decimal", legacyRule);
        SalesQuotationCreateRequestVO payload = request();
        payload.setDecimalPolicy(snapshot);
        assertThatThrownBy(() -> service.createQuotation(71L, "writer", payload))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void calculatesQuotationWithTypedDecimalPolicy() throws Exception {
        Map<String, Object> qty = new java.util.HashMap<>();
        qty.put("places", 3);
        Map<String, Object> amount = new java.util.HashMap<>();
        amount.put("places", 3);
        amount.put("rounding", "DOWN");
        Map<String, Object> typed = new java.util.HashMap<>();
        typed.put("number", qty);
        typed.put("decimal", amount);
        typed.put("currency", amount);
        when(policy.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", typed));
        SalesQuotationCreateRequestVO r = request();
        r.setDetails(Collections.singletonList(line(null, "direct", "1.234", "1.235")));

        SalesQuotationVO saved = service.createQuotation(71L, "writer", r);

        assertThat(saved.getDetails().get(0).getUnitPrice()).isEqualByComparingTo("1.235");
        assertThat(saved.getDetails().get(0).getLineAmt()).isEqualByComparingTo("1.523");
        assertThat(saved.getVatAmt()).isEqualByComparingTo("0.152");
        assertThat(saved.getTotalAmt()).isEqualByComparingTo("1.675");
    }

    @Test
    void createsNumberAndRecalculatesAmountsForSnapshotAndMasterLines() throws Exception {
        SalesQuotationCreateRequestVO request = request();
        request.setDetails(Arrays.asList(line(null, "direct", "1.25", "1.11"),
                line(20L, "master snapshot", "2", "3")));
        SalesQuotationVO result = service.createQuotation(71L, "writer", request);

        assertThat(result.getQuotationNo()).isEqualTo("QT-20261116-0001");
        assertThat(result.getSupplyAmt()).isEqualByComparingTo("7.39");
        assertThat(result.getVatAmt()).isEqualByComparingTo("0.74");
        assertThat(result.getTotalAmt()).isEqualByComparingTo("8.13");
        ArgumentCaptor<Map<String, Object>> lines = ArgumentCaptor.forClass(Map.class);
        verify(dao, times(2)).insertDetail(lines.capture());
        assertThat(lines.getAllValues().get(0)).containsEntry("tenantId", 71L)
                .containsEntry("materialId", null).containsEntry("materialName", "direct")
                .containsEntry("lineAmt", new BigDecimal("1.39"));
        assertThat(lines.getAllValues().get(1)).containsEntry("materialId", 20L)
                .containsEntry("materialName", "master snapshot");
        verify(dao, times(1)).existsMaterial(argThat(m -> Long.valueOf(71).equals(m.get("tenantId"))
                && Long.valueOf(20).equals(m.get("id"))));
        verify(sequence).nextValue("SALES_QUOTATION_NO", "71", "20261116");
    }

    @Test
    void rejectsInvalidAndForeignMasterBeforeWriting() throws Exception {
        SalesQuotationCreateRequestVO r = request();
        r.setDetails(Collections.emptyList());
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.BAD_REQUEST);
        verifyNoInteractions(dao, sequence);
        r.setDetails(Collections.singletonList(line(20L, "x", "0", "1")));
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.BAD_REQUEST);
        r.setDetails(Collections.singletonList(line(20L, "x", "1", "1")));
        when(dao.existsMaterial(anyMap())).thenReturn(false);
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.NOT_FOUND);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void updateAndDeleteRequireActiveTenantScopedWriter() throws Exception {
        SalesQuotationVO stored = new SalesQuotationVO();
        stored.setCreatedBy("writer");
        when(dao.selectForUpdate(anyMap())).thenReturn(stored);
        assertStatus(() -> service.updateQuotation(71L, "other", 300L, request()), HttpStatus.FORBIDDEN);
        assertStatus(() -> service.deleteQuotation(71L, "other", 300L), HttpStatus.FORBIDDEN);
        verify(dao, never()).updateHeader(anyMap());
        verify(dao, never()).softDelete(anyMap());
        when(dao.selectForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.deleteQuotation(72L, "writer", 300L), HttpStatus.NOT_FOUND);
        verify(dao).selectForUpdate(argThat(m -> Long.valueOf(72).equals(m.get("tenantId"))));
    }

    @Test
    void writerUpdatesDetailsAndSoftDeletesWithTenantScope() throws Exception {
        SalesQuotationVO stored = new SalesQuotationVO();
        stored.setCreatedBy("writer");
        when(dao.selectForUpdate(anyMap())).thenReturn(stored);
        when(dao.selectHeader(anyMap())).thenReturn(stored);
        when(dao.updateHeader(anyMap())).thenReturn(1);
        when(dao.softDelete(anyMap())).thenReturn(1);
        service.updateQuotation(71L, "writer", 300L, request());
        verify(dao).deleteDetails(argThat(m -> Long.valueOf(71).equals(m.get("tenantId"))
                && Long.valueOf(300).equals(m.get("quotationId"))));
        verify(dao).insertDetail(anyMap());
        service.deleteQuotation(71L, "writer", 300L);
        verify(dao).softDelete(argThat(m -> Long.valueOf(71).equals(m.get("tenantId"))
                && "writer".equals(m.get("updatedBy"))));
    }

    @Test
    void rejectsBlankNameNegativePriceForeignCustomerAndExcessPrecision() throws Exception {
        SalesQuotationCreateRequestVO r = request();
        r.setDetails(Collections.singletonList(line(null, " ", "1", "1")));
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.BAD_REQUEST);
        r.setDetails(Collections.singletonList(line(null, "x", "1", "-1")));
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.BAD_REQUEST);
        r.setDetails(Collections.singletonList(line(null, "x", "1.001", "1")));
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.BAD_REQUEST);
        r.setDetails(Collections.singletonList(line(null, "x", "1", "1")));
        when(dao.existsCustomer(anyMap())).thenReturn(false);
        assertStatus(() -> service.createQuotation(71L, "writer", r), HttpStatus.NOT_FOUND);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void getAndOptionsStayWithinAuthenticatedTenant() throws Exception {
        when(dao.selectHeader(anyMap())).thenReturn(null);
        assertStatus(() -> service.getQuotation(71L, "writer", 300L), HttpStatus.NOT_FOUND);
        verify(dao).selectHeader(argThat(m -> Long.valueOf(71).equals(m.get("tenantId"))
                && Long.valueOf(300).equals(m.get("quotationId"))));
        service.options(71L, "writer", 10L, " QT ");
        verify(dao).selectOptions(argThat(m -> Long.valueOf(71).equals(m.get("tenantId"))
                && Long.valueOf(10).equals(m.get("customerId")) && "QT".equals(m.get("keyword"))));
    }

    @Test
    void invalidSequenceNeverPersistsQuotation() throws Exception {
        when(sequence.nextValue("SALES_QUOTATION_NO", "71", "20261116")).thenReturn(0L);
        assertThatThrownBy(() -> service.createQuotation(71L, "writer", request()))
                .isInstanceOf(IllegalStateException.class);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void sequenceAboveFourDigitsFailsWithoutPersistingQuotation() throws Exception {
        when(sequence.nextValue("SALES_QUOTATION_NO", "71", "20261116")).thenReturn(10000L);
        assertThatThrownBy(() -> service.createQuotation(71L, "writer", request()))
                .isInstanceOf(IllegalStateException.class);
        verify(dao, never()).insertHeader(anyMap());
        verify(dao, never()).insertDetail(anyMap());
    }

    @Test
    void maximumFourDigitSequenceIsAccepted() throws Exception {
        when(sequence.nextValue("SALES_QUOTATION_NO", "71", "20261116")).thenReturn(9999L);
        assertThat(service.createQuotation(71L, "writer", request()).getQuotationNo())
                .isEqualTo("QT-20261116-9999");
    }

    private SalesQuotationCreateRequestVO request() {
        SalesQuotationCreateRequestVO r = new SalesQuotationCreateRequestVO();
        r.setQuotationDt(LocalDate.of(2026, 11, 16));
        r.setCustomerId(10L);
        r.setDetails(Collections.singletonList(line(null, "item", "1", "2")));
        return r;
    }

    private SalesQuotationDetailCreateRequestVO line(Long id, String name, String qty, String price) {
        SalesQuotationDetailCreateRequestVO d = new SalesQuotationDetailCreateRequestVO();
        d.setMaterialId(id); d.setMaterialName(name);
        d.setQuotationQty(new BigDecimal(qty)); d.setUnitPrice(new BigDecimal(price));
        return d;
    }

    private void assertStatus(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, HttpStatus status) {
        assertThatThrownBy(call).isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatus()).isEqualTo(status);
    }
}
