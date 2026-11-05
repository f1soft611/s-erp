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
import egovframework.let.sales.order.create.domain.model.SalesOrderDetailVO;
import egovframework.let.sales.order.create.domain.model.SalesOrderVO;
import egovframework.let.sales.order.create.domain.repository.SalesOrderDAO;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.deliveryplan.service.SalesDeliveryPlanService;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanRequestVO;

class SalesOrderServiceImplTest {

    @Mock
    private SalesOrderDAO salesOrderDAO;

    @Mock
    private IdSequenceService idSequenceService;

    @Mock
    private SalesDeliveryPlanService salesDeliveryPlanService;

    private SalesOrderServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new SalesOrderServiceImpl(salesOrderDAO, idSequenceService, salesDeliveryPlanService);
        when(salesDeliveryPlanService.getMode(71L)).thenReturn("MANUAL");
        when(salesDeliveryPlanService.lockModeForPlanCreation(71L)).thenReturn("MANUAL");
        when(salesOrderDAO.existsCustomer(anyMap())).thenReturn(true);
        when(salesOrderDAO.existsMaterial(anyMap())).thenReturn(true);
        when(salesOrderDAO.insertOrderHeader(anyMap())).thenReturn(300L);
        when(salesOrderDAO.insertOrderDetail(anyMap())).thenReturn(400L);
        when(salesOrderDAO.selectOrderForUpdate(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.countDeliveryReferences(anyMap())).thenReturn(0);
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
    void createLocksTenantPlanModeBeforeInsertingTheOrderAndIgnoresUnlockedMode() throws Exception {
        when(salesDeliveryPlanService.getMode(71L)).thenReturn("AUTO");

        service.createOrder(71L, "user01", validPayload());

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(salesDeliveryPlanService, salesOrderDAO);
        order.verify(salesDeliveryPlanService).lockModeForPlanCreation(71L);
        order.verify(salesOrderDAO).insertOrderHeader(anyMap());
        verify(salesDeliveryPlanService, org.mockito.Mockito.never()).getMode(71L);
        verify(salesDeliveryPlanService, org.mockito.Mockito.never())
                .createAutomaticPlan(org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createsAutomaticPlanWithOrderDetailDatesFallingBackToHeaderDate() throws Exception {
        when(salesDeliveryPlanService.lockModeForPlanCreation(71L)).thenReturn("AUTO");
        SalesOrderCreateRequestVO payload = validPayload();
        payload.setDeliveryDt(LocalDate.of(2026, 11, 5));
        payload.getDetails().get(0).setDeliveryDt(null);
        when(salesOrderDAO.insertOrderDetail(anyMap())).thenReturn(401L);

        service.createOrder(71L, "user01", payload);

        ArgumentCaptor<SalesDeliveryPlanRequestVO> request =
                ArgumentCaptor.forClass(SalesDeliveryPlanRequestVO.class);
        org.mockito.Mockito.verify(salesDeliveryPlanService)
                .createAutomaticPlan(org.mockito.ArgumentMatchers.eq(71L),
                        org.mockito.ArgumentMatchers.eq("user01"), request.capture());
        assertThat(request.getValue().getSalesOrderId()).isEqualTo(300L);
        assertThat(request.getValue().getDetails()).hasSize(1);
        assertThat(request.getValue().getDetails().get(0).getSalesOrderDetailId()).isEqualTo(401L);
        assertThat(request.getValue().getDetails().get(0).getPlanDt())
                .isEqualTo(LocalDate.of(2026, 11, 5));
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

    @Test
    void loadsTenantScopedOrderWithDetailsInLineOrder() throws Exception {
        SalesOrderVO stored = storedOrder("수주등록");
        SalesOrderDetailVO line = new SalesOrderDetailVO();
        line.setLineNo(1);
        line.setMaterialCode("M-20");
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(stored);
        when(salesOrderDAO.selectOrderDetails(anyMap()))
                .thenReturn(Collections.singletonList(line));

        SalesOrderVO loaded = service.getOrder(71L, "user01", 300L);

        assertThat(loaded.getOrderNo()).isEqualTo("SO-20261027-0001");
        assertThat(loaded.getDetails()).extracting("materialCode").containsExactly("M-20");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).selectOrder(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("salesOrderId", 300L);
    }

    @Test
    void marksOrderAsWrittenByTheAuthenticatedUserOnlyWhenCreatorMatches() throws Exception {
        SalesOrderVO mine = storedOrder("수주등록");
        mine.setCreatedBy("user01");
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(mine);
        when(salesOrderDAO.selectOrderDetails(anyMap())).thenReturn(Collections.emptyList());

        assertThat(service.getOrder(71L, "user01", 300L).getWriter()).isTrue();

        SalesOrderVO others = storedOrder("수주등록");
        others.setCreatedBy("user02");
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(others);

        assertThat(service.getOrder(71L, "user01", 300L).getWriter()).isFalse();
    }

    @Test
    void rejectsMissingOrDeletedOrderWithNotFound() throws Exception {
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.getOrder(71L, "user01", 300L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void updatesHeaderAndInsertsMissingDetailsWithoutRenumberingTheOrder() throws Exception {
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.countShippedDetails(anyMap())).thenReturn(0);
        when(salesOrderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(salesOrderDAO.selectOrderDetails(anyMap())).thenReturn(Collections.emptyList());

        SalesOrderVO updated = service.updateOrder(71L, "user02", 300L, validPayload());

        assertThat(updated.getSalesOrderId()).isEqualTo(300L);
        ArgumentCaptor<Map<String, Object>> headerParams = ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).updateOrderHeader(headerParams.capture());
        assertThat(headerParams.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("salesOrderId", 300L)
                .containsEntry("customerId", 10L)
                .containsEntry("updatedBy", "user02")
                .containsEntry("totalAmt", new BigDecimal("5.00"))
                .doesNotContainKey("orderNo");
        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(salesOrderDAO);
        inOrder.verify(salesOrderDAO).updateOrderHeader(anyMap());
        inOrder.verify(salesOrderDAO).insertOrderDetail(argThat(params ->
                Integer.valueOf(1).equals(params.get("lineNo"))
                        && Long.valueOf(300L).equals(params.get("salesOrderId"))));
        verifyNoInteractions(idSequenceService);
    }

    @Test
    void preservesExistingDetailIdentityWhenUpdatingTheSameLine() throws Exception {
        SalesOrderDetailVO existing = new SalesOrderDetailVO();
        existing.setSalesOrderDetailId(401L);
        existing.setSalesOrderId(300L);
        existing.setTenantId(71L);
        existing.setLineNo(1);
        existing.setMaterialId(20L);
        existing.setOrderQty(new BigDecimal("2.00"));
        existing.setShippedQty(new BigDecimal("0.00"));
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.selectOrderDetails(anyMap()))
                .thenReturn(Collections.singletonList(existing), Collections.singletonList(existing));
        when(salesOrderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(salesOrderDAO.updateOrderDetail(anyMap())).thenReturn(1);

        service.updateOrder(71L, "user02", 300L, validPayload());

        verify(salesOrderDAO, org.mockito.Mockito.never()).insertOrderDetail(anyMap());
        ArgumentCaptor<Map<String, Object>> detailParams = ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).updateOrderDetail(detailParams.capture());
        assertThat(detailParams.getValue()).containsEntry("salesOrderDetailId", 401L)
                .containsEntry("lineNo", 1)
                .containsEntry("materialId", 20L);
    }

    @Test
    void synchronizesAutomaticPlanAfterUpdatingOrderDetails() throws Exception {
        SalesOrderDetailVO existing = new SalesOrderDetailVO();
        existing.setSalesOrderDetailId(401L);
        existing.setSalesOrderId(300L);
        existing.setTenantId(71L);
        existing.setLineNo(1);
        existing.setMaterialId(20L);
        existing.setOrderQty(new BigDecimal("2.00"));
        existing.setShippedQty(new BigDecimal("0.00"));
        when(salesDeliveryPlanService.getMode(71L)).thenReturn("AUTO");
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.selectOrderDetails(anyMap()))
                .thenReturn(Collections.singletonList(existing), Collections.singletonList(existing));
        when(salesOrderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(salesOrderDAO.updateOrderDetail(anyMap())).thenReturn(1);

        service.updateOrder(71L, "user02", 300L, validPayload());

        org.mockito.Mockito.verify(salesDeliveryPlanService).synchronizeAutomaticPlan(
                org.mockito.ArgumentMatchers.eq(71L), org.mockito.ArgumentMatchers.eq("user02"),
                org.mockito.ArgumentMatchers.eq(300L),
                org.mockito.ArgumentMatchers.eq(Collections.singletonList(401L)));
    }

    @Test
    void rejectsReducingOrderQuantityBelowShippedQuantity() throws Exception {
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        SalesOrderDetailVO existing = new SalesOrderDetailVO();
        existing.setSalesOrderDetailId(401L);
        existing.setLineNo(1);
        existing.setMaterialId(20L);
        existing.setOrderQty(new BigDecimal("3.00"));
        existing.setShippedQty(new BigDecimal("2.50"));
        when(salesOrderDAO.selectOrderDetails(anyMap())).thenReturn(Collections.singletonList(existing));

        assertThatThrownBy(() -> service.updateOrder(71L, "user02", 300L, validPayload()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(salesOrderDAO, org.mockito.Mockito.never()).updateOrderHeader(anyMap());
        verify(salesOrderDAO, org.mockito.Mockito.never()).updateOrderHeader(anyMap());
    }

    @Test
    void warnAllowsUnrelatedAutoOrderEditWithoutInflatingBaselineOrChangingReferences() throws Exception {
        when(salesDeliveryPlanService.getMode(71L)).thenReturn("AUTO");
        when(salesDeliveryPlanService.getOverDeliveryPolicy(71L)).thenReturn("WARN");
        SalesOrderDetailVO existing = new SalesOrderDetailVO();
        existing.setSalesOrderDetailId(401L);
        existing.setLineNo(1);
        existing.setMaterialId(20L);
        existing.setOrderQty(new BigDecimal("2.00"));
        existing.setShippedQty(new BigDecimal("3.00"));
        when(salesOrderDAO.selectOrderDetails(anyMap())).thenReturn(Collections.singletonList(existing));
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(salesOrderDAO.updateOrderDetail(anyMap())).thenReturn(1);
        when(salesOrderDAO.countOrderDeliveryReferences(anyMap())).thenReturn(1);
        SalesOrderCreateRequestVO payload = validPayload();
        payload.setRemark("비고 수정");

        service.updateOrder(71L, "user02", 300L, payload);

        verify(salesOrderDAO).updateOrderDetail(argThat(params ->
                Long.valueOf(401L).equals(params.get("salesOrderDetailId"))
                        && new BigDecimal("2.00").equals(params.get("orderQty"))
                        && !params.containsKey("shippedQty")));
        verify(salesDeliveryPlanService).synchronizeAutomaticPlan(
                71L, "user02", 300L, Collections.singletonList(401L));
    }

    @Test
    void softDeletesOnlyEditableOrders() throws Exception {
        when(salesOrderDAO.selectOrder(anyMap())).thenReturn(storedOrder("수주등록"));
        when(salesOrderDAO.countShippedDetails(anyMap())).thenReturn(0);
        when(salesOrderDAO.softDeleteOrderHeader(anyMap())).thenReturn(1);

        service.deleteOrder(71L, "user02", 300L);

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(salesOrderDAO).softDeleteOrderHeader(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("salesOrderId", 300L)
                .containsEntry("updatedBy", "user02");

        when(salesOrderDAO.selectOrderForUpdate(anyMap())).thenReturn(storedOrder("출하완료"));
        assertThatThrownBy(() -> service.deleteOrder(71L, "user02", 300L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void locksOrderAndRejectsDeletingAReferencedDetail() throws Exception {
        SalesOrderDetailVO first = new SalesOrderDetailVO();
        first.setSalesOrderDetailId(401L);
        first.setLineNo(1);
        first.setMaterialId(20L);
        first.setOrderQty(new BigDecimal("2.00"));
        first.setShippedQty(new BigDecimal("0.00"));
        SalesOrderDetailVO second = new SalesOrderDetailVO();
        second.setSalesOrderDetailId(402L);
        second.setLineNo(2);
        second.setMaterialId(21L);
        second.setOrderQty(new BigDecimal("2.00"));
        second.setShippedQty(new BigDecimal("0.00"));
        when(salesOrderDAO.selectOrderDetails(anyMap())).thenReturn(Arrays.asList(first, second));
        when(salesOrderDAO.countOrderDetailReferences(argThat(params ->
                Long.valueOf(402L).equals(params.get("salesOrderDetailId"))))).thenReturn(1);

        assertThatThrownBy(() -> service.updateOrder(71L, "user02", 300L, validPayload()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(salesOrderDAO);
        inOrder.verify(salesOrderDAO).selectOrderForUpdate(anyMap());
        inOrder.verify(salesOrderDAO).selectOrderDetails(anyMap());
        verify(salesOrderDAO, org.mockito.Mockito.never()).updateOrderHeader(anyMap());
    }

    @Test
    void rejectsDeletingOrderWithDeliveryHistoryAfterLockingIt() throws Exception {
        when(salesOrderDAO.countDeliveryReferences(anyMap())).thenReturn(1);

        assertThatThrownBy(() -> service.deleteOrder(71L, "user02", 300L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(salesOrderDAO).selectOrderForUpdate(anyMap());
        verify(salesOrderDAO, org.mockito.Mockito.never()).softDeleteOrderHeader(anyMap());
    }

    private SalesOrderVO storedOrder(String status) {
        SalesOrderVO order = new SalesOrderVO();
        order.setSalesOrderId(300L);
        order.setTenantId(71L);
        order.setOrderNo("SO-20261027-0001");
        order.setOrderDt(LocalDate.of(2026, 10, 27));
        order.setCustomerId(10L);
        order.setStatus(status);
        return order;
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
