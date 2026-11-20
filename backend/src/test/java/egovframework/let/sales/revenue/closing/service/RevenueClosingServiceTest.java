package egovframework.let.sales.revenue.closing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseRequestVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingSearchVO;
import egovframework.let.sales.revenue.closing.domain.repository.RevenueClosingDAO;
import egovframework.let.sales.revenue.closing.service.impl.RevenueClosingServiceImpl;
import egovframework.let.sales.shipment.statement.service.impl.SalesStatementServiceImpl;

class RevenueClosingServiceTest {
    @Mock
    private RevenueClosingDAO dao;

    @Mock
    private SalesStatementServiceImpl statements;

    private RevenueClosingServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RevenueClosingServiceImpl(dao, statements);
    }

    @Test
    void appliesValidatedTenantDateKeywordAndCustomerFiltersToBothQueries() throws Exception {
        when(dao.selectDetails(anyMap())).thenReturn(Collections.emptyList());
        when(dao.selectCustomerSummaries(anyMap())).thenReturn(Collections.emptyList());
        RevenueClosingSearchVO search = new RevenueClosingSearchVO();
        search.setDeliveryDtFrom("2026-11-01");
        search.setDeliveryDtTo("2026-11-30");
        search.setKeyword("  품목  ");
        search.setCustomerIds(Arrays.asList(21L, 21L, 34L));

        RevenueClosingResponseVO result = service.search(9L, "user-1", search);

        assertThat(result.getDetails()).isEmpty();
        assertThat(result.getCustomerSummaries()).isEmpty();
        ArgumentCaptor<Map<String, Object>> detailParams = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<Map<String, Object>> summaryParams = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectDetails(detailParams.capture());
        verify(dao).selectCustomerSummaries(summaryParams.capture());
        assertThat(detailParams.getValue())
                .containsEntry("tenantId", 9L)
                .containsEntry("deliveryDtFrom", LocalDate.of(2026, 11, 1))
                .containsEntry("deliveryDtTo", LocalDate.of(2026, 11, 30))
                .containsEntry("keyword", "품목")
                .containsEntry("customerIds", Arrays.asList(21L, 34L));
        assertThat(summaryParams.getValue()).isEqualTo(detailParams.getValue());
    }

    @Test
    void rejectsInvalidOrReversedDatesBeforeQuerying() throws Exception {
        RevenueClosingSearchVO search = new RevenueClosingSearchVO();
        search.setDeliveryDtFrom("2026-02-30");
        search.setDeliveryDtTo("2026-03-01");

        assertThatThrownBy(() -> service.search(9L, "user-1", search))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).selectDetails(anyMap());
        verify(dao, never()).selectCustomerSummaries(anyMap());

        search.setDeliveryDtFrom("2026-11-02");
        search.setDeliveryDtTo("2026-11-01");
        assertThatThrownBy(() -> service.search(9L, "user-1", search))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).selectDetails(anyMap());
    }

    @Test
    void rejectsNonPositiveCustomerIds() throws Exception {
        RevenueClosingSearchVO search = new RevenueClosingSearchVO();
        search.setDeliveryDtFrom("2026-11-01");
        search.setDeliveryDtTo("2026-11-30");
        search.setCustomerIds(Collections.singletonList(0L));

        assertThatThrownBy(() -> service.search(9L, "user-1", search))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).selectDetails(anyMap());
    }

    @Test
    void closesSelectedLinesAndCreatesStatementsOnlyForLinesWithoutAnActiveStatement() throws Exception {
        RevenueClosingCloseRequestVO request = new RevenueClosingCloseRequestVO();
        request.setSalesDeliveryDetailIds(Arrays.asList(34L, 21L, 34L));
        request.setStatementDt("2026-11-20");
        when(dao.lockDetailsForClosing(anyMap())).thenReturn(Arrays.asList(
                closingLine(21L, 5L, true, false), closingLine(34L, 5L, false, false)));
        when(dao.markDetailsClosed(anyMap())).thenReturn(2);
        Map<String, Object> statement = new HashMap<String, Object>();
        statement.put("salesStatementId", 501L);
        statement.put("statementNo", "TS-20261120-0001");
        when(statements.createBatch(9L, "user-1", Collections.singletonList(34L), "2026-11-20"))
                .thenReturn(Collections.singletonList(statement));

        RevenueClosingCloseResponseVO result = service.close(9L, "user-1", request);

        assertThat(result.getClosedCount()).isEqualTo(2);
        assertThat(result.getItems()).containsExactly(statement);
        verify(statements).createBatch(9L, "user-1", Collections.singletonList(34L), "2026-11-20");
        ArgumentCaptor<Map<String, Object>> closedParams = ArgumentCaptor.forClass(Map.class);
        verify(dao).markDetailsClosed(closedParams.capture());
        assertThat(closedParams.getValue()).containsEntry("tenantId", 9L)
                .containsEntry("userId", "user-1")
                .containsEntry("salesDeliveryDetailIds", Arrays.asList(21L, 34L));

        request.setSalesDeliveryDetailIds(Arrays.asList(21L, 21L));
        when(dao.lockDetailsForClosing(anyMap())).thenReturn(Collections.singletonList(
                closingLine(21L, 5L, true, false)));
        when(dao.markDetailsClosed(anyMap())).thenReturn(1);
        RevenueClosingCloseResponseVO alreadyIssued =
                service.close(9L, "user-1", request);
        assertThat(alreadyIssued.getClosedCount()).isEqualTo(1);
        assertThat(alreadyIssued.getItems()).isEmpty();
        verify(statements, org.mockito.Mockito.times(1))
                .createBatch(org.mockito.ArgumentMatchers.eq(9L),
                        org.mockito.ArgumentMatchers.eq("user-1"),
                        org.mockito.ArgumentMatchers.anyList(),
                        org.mockito.ArgumentMatchers.eq("2026-11-20"));

        request.setSalesDeliveryDetailIds(Collections.singletonList(0L));
        assertThatThrownBy(() -> service.close(9L, "user-1", request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsAlreadyClosedOrMissingLinesBeforeIssuingAnyStatement() throws Exception {
        RevenueClosingCloseRequestVO request = new RevenueClosingCloseRequestVO();
        request.setSalesDeliveryDetailIds(Collections.singletonList(21L));
        request.setStatementDt("2026-11-20");
        when(dao.lockDetailsForClosing(anyMap())).thenReturn(Collections.singletonList(
                closingLine(21L, 5L, false, true)));

        assertThatThrownBy(() -> service.close(9L, "user-1", request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(statements, never()).createBatch(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.anyString());
        verify(dao, never()).markDetailsClosed(anyMap());
    }

    private Map<String, Object> closingLine(Long detailId, Long customerId,
            boolean statementIssued, boolean closed) {
        Map<String, Object> line = new HashMap<String, Object>();
        line.put("salesDeliveryDetailId", detailId);
        line.put("customerId", customerId);
        line.put("hasActiveStatement", statementIssued);
        line.put("revenueClosedAt", closed ? LocalDate.of(2026, 11, 20) : null);
        return line;
    }
}
