package egovframework.let.sales.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.sales.order.create.domain.model.SalesOrderCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderDetailCreateRequestVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.domain.repository.SalesOrderDAO;
import egovframework.let.common.idsequence.service.IdSequenceService;

class SalesOrderServiceImplTest {

    @Mock
    private SalesOrderDAO salesOrderDAO;

    @Mock
    private IdSequenceService idSequenceService;

    private SalesOrderServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new SalesOrderServiceImpl(salesOrderDAO, idSequenceService);
        when(salesOrderDAO.existsCustomer(anyMap())).thenReturn(true);
        when(salesOrderDAO.existsMaterial(anyMap())).thenReturn(true);
        when(salesOrderDAO.insertOrderHeader(anyMap())).thenReturn(300L);
        when(salesOrderDAO.insertOrderDetail(anyMap())).thenReturn(400L);
        when(idSequenceService.nextValue("SALES_ORDER_NO", "71", "20261027"))
                .thenReturn(1L);
    }

    @Test
    void generatesTenantAndDateScopedNumberAndRecalculatesAmountsBeforePersistence() throws Exception {
        SalesOrderCreateRequestVO payload = validPayload();
        payload.getDetails().get(0).setOrderQty(new BigDecimal("1.25"));
        payload.getDetails().get(0).setUnitPrice(new BigDecimal("1.11"));
        payload.getDetails().get(0).setVatAmt(null);

        SalesOrderVO saved = service.createOrder(71L, "user01", payload);

        assertThat(saved.getOrderNo()).isEqualTo("SO-20261027-0001");
        assertThat(saved.getDetails()).hasSize(1);
        assertThat(saved.getDetails().get(0).getLineNo()).isEqualTo(1);
        assertThat(saved.getDetails().get(0).getSupplyAmt())
                .isEqualByComparingTo("1.39");
        assertThat(saved.getDetails().get(0).getVatAmt())
                .isEqualByComparingTo("0.14");
        assertThat(saved.getDetails().get(0).getTotalAmt())
                .isEqualByComparingTo("1.53");
        assertThat(saved.getTotalAmt()).isEqualByComparingTo("1.53");

        ArgumentCaptor<Map<String, Object>> headerParams =
                ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).insertOrderHeader(headerParams.capture());
        assertThat(headerParams.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("createdBy", "user01")
                .containsEntry("orderNo", "SO-20261027-0001")
                .containsEntry("status", "수주등록")
                .containsEntry("totalAmt", new BigDecimal("1.53"));

        ArgumentCaptor<Map<String, Object>> detailParams =
                ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).insertOrderDetail(detailParams.capture());
        assertThat(detailParams.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("salesOrderId", 300L)
                .containsEntry("lineNo", 1)
                .containsEntry("materialId", 20L)
                .containsEntry("shippedQty", new BigDecimal("0.00"))
                .containsEntry("lineStatus", "대기")
                .containsEntry("supplyAmt", new BigDecimal("1.39"))
                .containsEntry("vatAmt", new BigDecimal("0.14"))
                .containsEntry("totalAmt", new BigDecimal("1.53"));
        verify(idSequenceService).nextValue(
                "SALES_ORDER_NO", "71", "20261027");
    }

    @Test
    void preservesAnExplicitVatAmountAndAssignsLineNumbersInRequestOrder() throws Exception {
        SalesOrderCreateRequestVO payload = validPayload();
        SalesOrderDetailCreateRequestVO secondLine = detail(21L, "2", "3", "0.17");
        when(salesOrderDAO.existsMaterial(argThat(params ->
                Long.valueOf(21L).equals(params.get("id"))))).thenReturn(true);
        when(salesOrderDAO.insertOrderDetail(anyMap()))
                .thenReturn(400L, 401L);
        payload.setDetails(Arrays.asList(payload.getDetails().get(0), secondLine));

        SalesOrderVO saved = service.createOrder(71L, "user01", payload);

        assertThat(saved.getDetails()).extracting("lineNo").containsExactly(1, 2);
        assertThat(saved.getDetails().get(1).getVatAmt())
                .isEqualByComparingTo("0.17");
        assertThat(saved.getTotalAmt()).isEqualByComparingTo("11.17");
    }

    @Test
    void rejectsAnEmptyOrderBeforeGeneratingANumberOrWritingRows() {
        SalesOrderCreateRequestVO payload = validPayload();
        payload.setDetails(Collections.emptyList());

        assertThatThrownBy(() -> service.createOrder(71L, "user01", payload))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(idSequenceService);
        verifyNoInteractions(salesOrderDAO);
    }

    @Test
    void rejectsCustomerOutsideAuthenticatedTenantBeforeGeneratingANumber() throws Exception {
        when(salesOrderDAO.existsCustomer(argThat(params ->
                Long.valueOf(10L).equals(params.get("id"))))).thenReturn(false);

        assertThatThrownBy(() -> service.createOrder(71L, "user01", validPayload()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);

        verifyNoInteractions(idSequenceService);
    }

    @Test
    void rejectsAnOrderNumberThatCannotFitTheSchema() throws Exception {
        when(idSequenceService.nextValue(
                "SALES_ORDER_NO", "71", "20261027"))
                .thenReturn(Long.MAX_VALUE);

        assertThatThrownBy(() -> service.createOrder(71L, "user01", validPayload()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);

        verify(salesOrderDAO).existsCustomer(anyMap());
        verify(salesOrderDAO).existsMaterial(anyMap());
        verify(salesOrderDAO, org.mockito.Mockito.never())
                .insertOrderHeader(anyMap());
    }

    private SalesOrderCreateRequestVO validPayload() {
        SalesOrderCreateRequestVO payload = new SalesOrderCreateRequestVO();
        payload.setOrderDt(LocalDate.of(2026, 10, 27));
        payload.setCustomerId(10L);
        payload.setDetails(Collections.singletonList(detail(20L, "2", "2", "1.00")));
        return payload;
    }

    private SalesOrderDetailCreateRequestVO detail(
            Long materialId, String quantity, String unitPrice, String vat) {
        SalesOrderDetailCreateRequestVO detail = new SalesOrderDetailCreateRequestVO();
        detail.setMaterialId(materialId);
        detail.setOrderQty(new BigDecimal(quantity));
        detail.setUnitPrice(new BigDecimal(unitPrice));
        detail.setVatAmt(vat == null ? null : new BigDecimal(vat));
        return detail;
    }
}
