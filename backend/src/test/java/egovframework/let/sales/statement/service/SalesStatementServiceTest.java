package egovframework.let.sales.statement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.statement.domain.repository.SalesStatementDAO;
import egovframework.let.sales.statement.service.impl.SalesStatementServiceImpl;

class SalesStatementServiceTest {
    @Mock private SalesStatementDAO dao;
    @Mock private IdSequenceService sequence;
    private SalesStatementServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new SalesStatementServiceImpl(dao, sequence);
    }

    @Test
    void createsSnapshotOnlyAfterLockingTenantDelivery() throws Exception {
        when(dao.lockDelivery(anyMap())).thenReturn(15L);
        when(dao.insertHeader(anyMap())).thenReturn(100L);
        when(dao.insertDetails(anyMap())).thenReturn(1);
        when(sequence.nextValue("SALES_STATEMENT_NO", "71", "20261109")).thenReturn(1L);
        Map<String, Object> stored = new HashMap<String, Object>();
        stored.put("statementNo", "TS-20261109-0001");
        when(dao.selectHeader(anyMap())).thenReturn(stored);
        when(dao.selectDetails(anyMap())).thenReturn(Collections.emptyList());

        Map<String, Object> result = service.create(71L, "user01", 15L, "2026-11-09", "참고");

        assertThat(result).containsEntry("statementNo", "TS-20261109-0001");
        InOrder order = inOrder(dao);
        order.verify(dao).lockDelivery(anyMap());
        order.verify(dao).existsActive(anyMap());
        order.verify(dao).insertHeader(anyMap());
        order.verify(dao).insertDetails(anyMap());
    }

    @Test
    void rejectsDuplicateStatementWithoutCreatingAnything() throws Exception {
        when(dao.lockDelivery(anyMap())).thenReturn(15L);
        when(dao.existsActive(anyMap())).thenReturn(true);
        assertThatThrownBy(() -> service.create(71L, "user01", 15L, "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void rejectsForeignOrMissingDeliveryWithoutCreatingAnything() throws Exception {
        when(dao.lockDelivery(anyMap())).thenReturn(null);
        assertThatThrownBy(() -> service.create(71L, "user01", 999L, "2026-11-09", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(dao, never()).insertHeader(anyMap());
    }

    @Test
    void rejectsInvalidDateBeforeLocking() throws Exception {
        assertThatThrownBy(() -> service.create(71L, "user01", 15L, "2026-02-30", ""))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(dao, never()).lockDelivery(anyMap());
    }
}
