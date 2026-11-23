package egovframework.let.sales.master.destination.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Collections;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.master.destination.domain.model.SalesDestinationVO;
import egovframework.let.sales.master.destination.domain.repository.SalesDestinationDAO;

class SalesDestinationServiceImplTest {
    @Mock private SalesDestinationDAO dao;
    @Mock private IdSequenceService sequences;
    private SalesDestinationServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new SalesDestinationServiceImpl(dao, sequences);
    }

    @Test
    void generatesCodeAndScopesTheInsertToTheAuthenticatedTenantAndCustomer() throws Exception {
        SalesDestinationVO input = new SalesDestinationVO();
        input.setCustomerId(12L);
        input.setDestinationName("납품처");
        when(dao.customerExists(anyMap())).thenReturn(true);
        when(sequences.nextValue("SALES_DESTINATION_CODE", "71", "")).thenReturn(1L);
        when(dao.insert(anyMap())).thenReturn(99L);
        when(dao.find(anyMap())).thenReturn(input);
        service.create(71L, "user", input);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).insert(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("customerId", 12L)
                .containsEntry("destinationCode", "000001");
    }

    @Test
    void refusesToCreateForAnotherTenantsCustomer() throws Exception {
        SalesDestinationVO input = new SalesDestinationVO();
        input.setCustomerId(12L);
        input.setDestinationName("납품처");
        when(dao.customerExists(anyMap())).thenReturn(false);
        assertThatThrownBy(() -> service.create(71L, "user", input))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void refusesToDeleteDestinationReferencedByAnOrder() throws Exception {
        when(dao.countOrders(anyMap())).thenReturn(1);
        assertThatThrownBy(() -> service.delete(71L, 99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("수주");
    }

    @Test
    void rejectsBatchRowsBelongingToAnotherCustomerBeforeWriting() throws Exception {
        SalesDestinationVO row = new SalesDestinationVO();
        row.setCustomerId(13L);
        row.setDestinationName("납품처");
        assertThatThrownBy(() -> service.saveBatch(71L, "user", 12L,
                Collections.singletonList(row), Collections.<SalesDestinationVO>emptyList()))
                .isInstanceOf(ResponseStatusException.class);
        org.mockito.Mockito.verifyNoInteractions(sequences);
        org.mockito.Mockito.verifyNoInteractions(dao);
    }
}
