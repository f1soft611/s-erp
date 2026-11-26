package egovframework.let.sales.shipment.statement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.shipment.statement.domain.repository.SalesStatementDAO;
import egovframework.let.sales.shipment.statement.service.impl.SalesStatementServiceImpl;
import egovframework.let.system.policies.service.SystemPolicyService;

class SalesStatementServiceTest {
    @Mock
    private SalesStatementDAO dao;
    @Mock
    private IdSequenceService sequence;
    @Mock
    private SystemPolicyService policies;
    private SalesStatementServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new SalesStatementServiceImpl(dao, sequence, policies);
    }

    @Test
    void createsOneStatementForSelectedDetailsAcrossDeliveriesOfOneCustomer() throws Exception {
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Arrays.asList(
                line(21L, 15L, 31L, false, false), line(22L, 16L, 31L, false, false)));
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L);
        when(dao.insertHeader(anyMap())).thenReturn(100L);
        when(dao.insertDetails(anyMap())).thenReturn(2);
        when(dao.selectHeader(anyMap())).thenReturn(statement());
        when(dao.selectDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());

        Map<String, Object> result = service.create(71L, "user01", 15L,
                Arrays.asList(22L, 21L, 22L), "2026-11-09", "참고");

        assertThat(result).containsEntry("statementNo", "TS-20261109-0001");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).lockDeliveryDetails(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("salesDeliveryDetailIds", Arrays.asList(21L, 22L));
        verify(dao, times(1)).insertHeader(anyMap());
        ArgumentCaptor<Map<String, Object>> header = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertHeader(header.capture());
        assertThat(header.getValue()).containsEntry("customerId", 31L)
                .containsEntry("salesDeliveryId", 15L)
                .containsEntry("salesDeliveryDetailIds", Arrays.asList(21L, 22L));
    }

    @Test
    void storesTheHeaderTotalRoundedByTheDeliveryTotalRuleInsteadOfTheRawSum() throws Exception {
        Map<String, Object> currency = new HashMap<String, Object>();
        currency.put("places", 1);
        currency.put("rounding", "DOWN");
        Map<String, Object> module = new HashMap<String, Object>();
        module.put("currency", currency);
        when(policies.getGridDecimals(71L)).thenReturn(Collections.singletonMap("SALES", module));
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Arrays.asList(
                line(21L, 15L, 31L, false, false, new BigDecimal("1.29")),
                line(22L, 16L, 31L, false, false, new BigDecimal("1.29"))));
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L);
        when(dao.insertHeader(anyMap())).thenReturn(100L);
        when(dao.insertDetails(anyMap())).thenReturn(2);
        when(dao.selectHeader(anyMap())).thenReturn(statement());
        when(dao.selectDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());

        service.createBatch(71L, "user01", Arrays.asList(21L, 22L), "2026-11-09");

        ArgumentCaptor<Map<String, Object>> header = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertHeader(header.capture());
        assertThat(header.getValue().get("totalAmt")).isEqualTo(new BigDecimal("2.5"));
    }

    @Test
    void doesNotCreateAStatementWhenTheDecimalPolicyCannotBeRead() throws Exception {
        when(policies.getGridDecimals(71L)).thenThrow(new IllegalStateException("policy"));
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Collections.singletonList(
                line(21L, 15L, 31L, false, false)));
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L);

        assertThatThrownBy(() -> service.createBatch(71L, "user01", Collections.singletonList(21L), "2026-11-09"))
                .isInstanceOf(IllegalStateException.class);
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void rejectsSelectedLinesFromDifferentCustomersBeforeCreatingAStatement() throws Exception {
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Arrays.asList(
                line(21L, 15L, 31L, false, false), line(22L, 16L, 32L, false, false)));

        assertThatThrownBy(() -> service.create(71L, "user01", 15L,
                Arrays.asList(21L, 22L), "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void batchGroupsSelectedDetailsByCustomerAndDeduplicatesIdsInStableOrder() throws Exception {
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Arrays.asList(
                line(21L, 15L, 31L, false, false),
                line(22L, 16L, 31L, false, false),
                line(23L, 17L, 32L, false, false)));
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L, 2L);
        when(dao.insertHeader(anyMap())).thenReturn(100L, 101L);
        when(dao.insertDetails(anyMap())).thenReturn(2, 1);
        when(dao.selectHeader(anyMap())).thenReturn(statement(), statement());
        when(dao.selectDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());

        List<Map<String, Object>> results = service.createBatch(71L, "user01",
                Arrays.asList(23L, 22L, 21L, 22L), "2026-11-09");

        assertThat(results).hasSize(2);
        ArgumentCaptor<Map<String, Object>> lock = ArgumentCaptor.forClass(Map.class);
        verify(dao).lockDeliveryDetails(lock.capture());
        assertThat(lock.getValue()).containsEntry("salesDeliveryDetailIds", Arrays.asList(21L, 22L, 23L));
        ArgumentCaptor<Map<String, Object>> headers = ArgumentCaptor.forClass(Map.class);
        verify(dao, times(2)).insertHeader(headers.capture());
        assertThat(headers.getAllValues()).extracting(item -> item.get("customerId"))
                .containsExactly(31L, 32L);
        assertThat(headers.getAllValues()).extracting(item -> item.get("salesDeliveryDetailIds"))
                .containsExactly(Arrays.asList(21L, 22L), Collections.singletonList(23L));
    }

    @Test
    void rejectsMissingClosedOrAlreadyIssuedLinesBeforeCreatingAnything() throws Exception {
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());
        assertThatThrownBy(() -> service.createBatch(71L, "user01",
                Collections.singletonList(21L), "2026-11-09"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(dao, never()).insertHeader(anyMap());

        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Collections.singletonList(
                line(21L, 15L, 31L, true, false)));
        assertThatThrownBy(() -> service.createBatch(71L, "user01",
                Collections.singletonList(21L), "2026-11-09"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(dao, never()).insertHeader(anyMap());

        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Collections.singletonList(
                line(21L, 15L, 31L, false, true)));
        assertThatThrownBy(() -> service.createBatch(71L, "user01",
                Collections.singletonList(21L), "2026-11-09"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void createsAllAvailableDetailsForLegacyAndAutomaticSingleDeliveryCalls() throws Exception {
        when(dao.lockDelivery(anyMap())).thenReturn(15L);
        when(dao.selectAvailableDetailIdsByDelivery(anyMap())).thenReturn(Arrays.asList(21L, 22L));
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Arrays.asList(
                line(21L, 15L, 31L, false, false), line(22L, 15L, 31L, false, false)));
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L);
        when(dao.insertHeader(anyMap())).thenReturn(100L);
        when(dao.insertDetails(anyMap())).thenReturn(2);
        when(dao.selectHeader(anyMap())).thenReturn(statement());
        when(dao.selectDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());

        service.create(71L, "user01", 15L, "2026-11-09", "");

        verify(dao).lockDelivery(anyMap());
        verify(dao).selectAvailableDetailIdsByDelivery(anyMap());
        verify(dao).insertDetails(anyMap());
    }

    @Test
    void rejectsInvalidDateEmptyBatchAndDeclaresRollbackForCheckedFailures() throws Exception {
        assertThatThrownBy(() -> service.createBatch(71L, "user01",
                Collections.<Long>emptyList(), "2026-11-09"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> service.create(71L, "user01", 15L,
                Collections.singletonList(21L), "2026-02-30", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).lockDeliveryDetails(anyMap());

        Transactional transaction = SalesStatementServiceImpl.class
                .getMethod("createBatch", Long.class, String.class, List.class, String.class)
                .getAnnotation(Transactional.class);
        assertThat(transaction).isNotNull();
        assertThat(transaction.rollbackFor()).contains(Exception.class);
    }

    @Test
    void enforcesDetailLimitForExplicitAndLegacyRequests() throws Exception {
        List<Long> ids = LongStream.rangeClosed(1, 101).boxed().collect(Collectors.toList());
        when(dao.lockDeliveryDetails(anyMap())).thenReturn(Collections.<Map<String, Object>>emptyList());
        assertThatThrownBy(() -> service.create(71L, "user01", 15L,
                ids.subList(0, 100), "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(dao).lockDeliveryDetails(anyMap());

        assertThatThrownBy(() -> service.create(71L, "user01", 15L, ids, "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(error.getReason()).contains("100건");
                });
        when(dao.lockDelivery(anyMap())).thenReturn(15L);
        when(dao.selectAvailableDetailIdsByDelivery(anyMap())).thenReturn(ids);
        assertThatThrownBy(() -> service.create(71L, "user01", 15L, null, "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(error.getReason()).contains("100건");
                });
        verify(dao, never()).insertHeader(anyMap());
    }

    private Map<String, Object> line(Long detailId, Long deliveryId, Long customerId,
            boolean issued, boolean closed) {
        return line(detailId, deliveryId, customerId, issued, closed, new BigDecimal("10.00"));
    }

    private Map<String, Object> line(Long detailId, Long deliveryId, Long customerId,
            boolean issued, boolean closed, BigDecimal total) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("totalAmt", total);
        result.put("salesDeliveryDetailId", detailId);
        result.put("salesDeliveryId", deliveryId);
        result.put("customerId", customerId);
        result.put("revenueClosedAt", closed ? LocalDate.of(2026, 11, 20) : null);
        result.put("hasActiveStatement", issued);
        return result;
    }

    private Map<String, Object> statement() {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("statementNo", "TS-20261109-0001");
        return result;
    }
}
