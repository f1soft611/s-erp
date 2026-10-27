package egovframework.let.sales.order.status.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.sales.order.status.domain.model.SalesOrderStatusSearchVO;
import egovframework.let.sales.order.status.domain.model.SalesOrderStatusVO;
import egovframework.let.sales.order.status.domain.repository.SalesOrderStatusDAO;

class SalesOrderStatusServiceImplTest {

    @Mock
    private SalesOrderStatusDAO salesOrderStatusDAO;

    private SalesOrderStatusServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new SalesOrderStatusServiceImpl(salesOrderStatusDAO);
        when(salesOrderStatusDAO.selectOrderStatusList(anyMap()))
                .thenReturn(Collections.singletonList(new SalesOrderStatusVO()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void passesTenantAndTrimmedFiltersAndDropsBlankValues() throws Exception {
        SalesOrderStatusSearchVO search = new SalesOrderStatusSearchVO();
        search.setKeyword("  SO-2026 ");
        search.setOrderDtFrom("2026-10-01");
        search.setOrderDtTo("2026-10-31");
        search.setCustomerKeyword(" ");
        search.setStatus("수주등록");
        search.setMaterialKeyword("볼트");

        List<SalesOrderStatusVO> rows = service.selectOrderStatusList(71L, search);

        assertThat(rows).hasSize(1);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(salesOrderStatusDAO).selectOrderStatusList(captor.capture());
        Map<String, Object> params = captor.getValue();
        assertThat(params)
                .containsEntry("tenantId", 71L)
                .containsEntry("keyword", "SO-2026")
                .containsEntry("orderDtFrom", "2026-10-01")
                .containsEntry("orderDtTo", "2026-10-31")
                .containsEntry("status", "수주등록")
                .containsEntry("materialKeyword", "볼트");
        assertThat(params.get("customerKeyword")).isNull();
        assertThat(params.get("deliveryDtFrom")).isNull();
    }

    @Test
    void searchesWithOnlyTenantWhenNoConditionIsGiven() throws Exception {
        service.selectOrderStatusList(71L, null);

        verify(salesOrderStatusDAO).selectOrderStatusList(anyMap());
    }

    @Test
    void rejectsInvalidDateFormatAndReversedRanges() {
        SalesOrderStatusSearchVO invalid = new SalesOrderStatusSearchVO();
        invalid.setOrderDtFrom("2026/10/01");
        assertThatThrownBy(() -> service.selectOrderStatusList(71L, invalid))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        SalesOrderStatusSearchVO reversed = new SalesOrderStatusSearchVO();
        reversed.setDeliveryDtFrom("2026-11-02");
        reversed.setDeliveryDtTo("2026-11-01");
        assertThatThrownBy(() -> service.selectOrderStatusList(71L, reversed))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(salesOrderStatusDAO);
    }
}
