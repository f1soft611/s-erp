package egovframework.let.sales.delivery.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
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

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailRequestVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryRequestVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryStatusSearchVO;
import egovframework.let.sales.delivery.domain.model.SalesDeliveryVO;
import egovframework.let.sales.delivery.domain.repository.SalesDeliveryDAO;
import egovframework.let.sales.deliveryplan.service.SalesDeliveryPlanService;

class SalesDeliveryServiceImplTest {
    @Mock
    private SalesDeliveryDAO dao;
    @Mock
    private IdSequenceService sequenceService;
    @Mock
    private SalesDeliveryPlanService planService;
    private SalesDeliveryServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new SalesDeliveryServiceImpl(dao, sequenceService, planService);
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("BLOCK");
        when(dao.existsActiveCustomer(anyMap())).thenReturn(true);
        when(dao.existsActiveMaterial(anyMap())).thenReturn(true);
        when(dao.insertDeliveryHeader(anyMap())).thenReturn(501L);
        when(dao.insertDeliveryDetail(anyMap())).thenReturn(601L, 602L);
        when(dao.adjustShippedQty(anyMap())).thenReturn(1);
        when(dao.adjustPlanDeliveredQty(anyMap())).thenReturn(1);
        when(sequenceService.nextValue("SALES_DELIVERY_NO", "71", "20261104"))
                .thenReturn(1L);
    }

    @Test
    void createsDirectDeliveryAndCalculatesAmountsAndNumberOnServer() throws Exception {
        SalesDeliveryRequestVO payload = directPayload();
        payload.getDetails().get(0).setDeliveryQty(new BigDecimal("1.25"));
        payload.getDetails().get(0).setUnitPrice(new BigDecimal("1.11"));
        payload.getDetails().get(0).setVatAmt(null);
        SalesDeliveryVO reloaded = new SalesDeliveryVO();
        reloaded.setCreatedBy("user01");
        reloaded.setDeliveryNo("SD-20261104-0001");
        reloaded.setTotalAmt(new BigDecimal("1.53"));
        when(dao.selectDelivery(anyMap())).thenReturn(reloaded);
        when(dao.selectDeliveryDetails(anyMap())).thenReturn(Collections.emptyList());

        SalesDeliveryVO saved = service.createDelivery(71L, "user01", payload);

        assertThat(saved.getTotalAmt()).isEqualByComparingTo("1.53");
        ArgumentCaptor<Map<String, Object>> header = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertDeliveryHeader(header.capture());
        assertThat(header.getValue()).containsEntry("tenantId", 71L)
                .containsEntry("createdBy", "user01")
                .containsEntry("deliveryNo", "SD-20261104-0001")
                .containsEntry("deliveryType", "DIRECT")
                .containsEntry("salesOrderId", null)
                .containsEntry("totalAmt", new BigDecimal("1.53"));
        ArgumentCaptor<Map<String, Object>> detail = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertDeliveryDetail(detail.capture());
        assertThat(detail.getValue()).containsEntry("deliveryType", "DIRECT")
                .containsEntry("salesOrderId", null)
                .containsEntry("salesOrderDetailId", null)
                .containsEntry("salesDeliveryPlanDetailId", null)
                .containsEntry("deliveryQty", new BigDecimal("1.25"))
                .containsEntry("supplyAmt", new BigDecimal("1.39"))
                .containsEntry("vatAmt", new BigDecimal("0.14"))
                .containsEntry("totalAmt", new BigDecimal("1.53"));
        verify(dao, never()).adjustShippedQty(anyMap());
    }

    @Test
    void linkedDeliveryLocksOrderBeforeReadingDetailsAndAllowsPartialRemainder() throws Exception {
        SalesDeliveryRequestVO payload = orderPayload("2");
        stubOrderAndLine("10", "4", "1");
        SalesDeliveryVO reloaded = new SalesDeliveryVO();
        reloaded.setCreatedBy("user01");
        when(dao.selectDelivery(anyMap())).thenReturn(reloaded);
        SalesDeliveryDetailVO savedLine = storedDetail("2");
        when(dao.selectDeliveryDetails(anyMap())).thenReturn(Collections.singletonList(savedLine));

        SalesDeliveryVO saved = service.createDelivery(71L, "user01", payload);

        assertThat(saved.getDetails().get(0).getDeliveryQty()).isEqualByComparingTo("2");
        org.mockito.InOrder order = inOrder(dao);
        order.verify(dao).lockSourceOrder(anyMap());
        order.verify(dao).selectSourcePlanDetail(anyMap());
        verify(dao).adjustShippedQty(argThat(params ->
                new BigDecimal("2.00").equals(params.get("deltaQty"))));
        verify(dao).adjustPlanDeliveredQty(argThat(params ->
                new BigDecimal("2.00").equals(params.get("deltaQty"))
                        && Long.valueOf(900L).equals(params.get("salesDeliveryPlanDetailId"))));
    }

    @Test
    void acceptsDeliveryOfExactlyTheRemainingOrderQuantity() throws Exception {
        stubOrderAndLine("10", "4", "1");
        SalesDeliveryVO reloaded = new SalesDeliveryVO();
        reloaded.setCreatedBy("user01");
        when(dao.selectDelivery(anyMap())).thenReturn(reloaded);
        when(dao.selectDeliveryDetails(anyMap()))
                .thenReturn(Collections.singletonList(storedDetail("3")));

        service.createDelivery(71L, "user01", orderPayload("3"));

        verify(dao).insertDeliveryHeader(anyMap());
        verify(dao).adjustShippedQty(argThat(params ->
                new BigDecimal("3.00").equals(params.get("deltaQty"))));
    }

    @Test
    void savesAndAdjustsEachDetailAgainstItsOwnSalesOrder() throws Exception {
        SalesDeliveryRequestVO payload = orderPayload("2");
        SalesDeliveryDetailRequestVO otherDetail = orderDetail("3");
        otherDetail.setSalesOrderId(301L);
        otherDetail.setSalesOrderDetailId(401L);
        otherDetail.setSalesDeliveryPlanDetailId(901L);
        otherDetail.setMaterialId(21L);
        payload.getDetails().get(0).setSalesOrderId(300L);
        payload.setDetails(Arrays.asList(payload.getDetails().get(0), otherDetail));

        SalesDeliverySourceOrderHeaderVO otherOrder = orderSnapshot();
        otherOrder.setSalesOrderId(301L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(orderSnapshot(), otherOrder);
        SalesDeliverySourceOrderVO firstLine = sourceLine("10", "10", "0");
        SalesDeliverySourceOrderVO secondLine = sourceLine("10", "10", "0");
        secondLine.setSalesOrderId(301L);
        secondLine.setSalesOrderDetailId(401L);
        secondLine.setSalesDeliveryPlanDetailId(901L);
        secondLine.setMaterialId(21L);
        when(dao.selectSourcePlanDetail(anyMap())).thenReturn(firstLine, secondLine);
        SalesDeliveryVO reloaded = new SalesDeliveryVO();
        reloaded.setCreatedBy("user01");
        when(dao.selectDelivery(anyMap())).thenReturn(reloaded);
        SalesDeliveryDetailVO firstSaved = storedDetail("2");
        SalesDeliveryDetailVO secondSaved = storedDetail("3");
        secondSaved.setSalesOrderId(301L);
        secondSaved.setSalesOrderDetailId(401L);
        secondSaved.setSalesDeliveryPlanDetailId(901L);
        secondSaved.setMaterialId(21L);
        when(dao.selectDeliveryDetails(anyMap())).thenReturn(Arrays.asList(firstSaved, secondSaved));

        service.createDelivery(71L, "user01", payload);

        ArgumentCaptor<Map<String, Object>> savedDetails = ArgumentCaptor.forClass(Map.class);
        verify(dao, org.mockito.Mockito.times(2)).insertDeliveryDetail(savedDetails.capture());
        assertThat(savedDetails.getAllValues().get(0)).containsEntry("salesOrderId", 300L)
                .containsEntry("salesOrderDetailId", 400L);
        assertThat(savedDetails.getAllValues().get(1)).containsEntry("salesOrderId", 301L)
                .containsEntry("salesOrderDetailId", 401L);
        verify(dao).adjustShippedQty(argThat(params ->
                Long.valueOf(300L).equals(params.get("salesOrderId"))
                        && Long.valueOf(400L).equals(params.get("salesOrderDetailId"))));
        verify(dao).adjustShippedQty(argThat(params ->
                Long.valueOf(301L).equals(params.get("salesOrderId"))
                        && Long.valueOf(401L).equals(params.get("salesOrderDetailId"))));
        verify(dao).adjustPlanDeliveredQty(argThat(params ->
                Long.valueOf(300L).equals(params.get("salesOrderId"))
                        && Long.valueOf(900L).equals(params.get("salesDeliveryPlanDetailId"))));
        verify(dao).adjustPlanDeliveredQty(argThat(params ->
                Long.valueOf(301L).equals(params.get("salesOrderId"))
                        && Long.valueOf(901L).equals(params.get("salesDeliveryPlanDetailId"))));
    }

    @Test
    void rejectsMultiOrderDeliveryWhenSourceCustomersDiffer() throws Exception {
        SalesDeliveryRequestVO payload = orderPayload("2");
        SalesDeliveryDetailRequestVO otherDetail = orderDetail("3");
        otherDetail.setSalesOrderId(301L);
        otherDetail.setSalesOrderDetailId(401L);
        otherDetail.setSalesDeliveryPlanDetailId(901L);
        payload.getDetails().get(0).setSalesOrderId(300L);
        payload.setDetails(Arrays.asList(payload.getDetails().get(0), otherDetail));
        SalesDeliverySourceOrderHeaderVO otherOrder = orderSnapshot();
        otherOrder.setSalesOrderId(301L);
        otherOrder.setCustomerId(11L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(orderSnapshot(), otherOrder);

        assertStatus(HttpStatus.CONFLICT, () ->
                service.createDelivery(71L, "user01", payload));

        verify(dao, never()).insertDeliveryHeader(anyMap());
    }

    @Test
    void rejectsLinkedOverDeliveryBeforeInsertingDeliveryRows() throws Exception {
        stubOrderAndLine("10", "4", "3");

        assertStatus(HttpStatus.CONFLICT, () ->
                service.createDelivery(71L, "user01", orderPayload("2")));

        verify(dao, never()).insertDeliveryHeader(anyMap());
        verify(dao, never()).adjustShippedQty(anyMap());
    }

    @Test
    void warnRequiresExplicitConfirmationAndReportsBothBaselinesBeforeAnyMutation() throws Exception {
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("WARN");
        stubOrderAndLine("4", "4", "4");

        assertThatThrownBy(() -> service.createDelivery(71L, "user01", orderPayload("2")))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(error.getReason()).startsWith("[OVER_DELIVERY_CONFIRM_REQUIRED]")
                            .contains("계획", "수주", "기준수량 4", "저장후누적 6", "초과수량 2");
                });
        verifyNoInteractions(sequenceService);
        verify(dao, never()).insertDeliveryHeader(anyMap());
        verify(dao, never()).insertDeliveryDetail(anyMap());
        verify(dao, never()).adjustShippedQty(anyMap());
        verify(dao, never()).adjustPlanDeliveredQty(anyMap());
    }

    @Test
    void confirmedWarnAllowsExhaustedPlanWithoutInflatingBaselines() throws Exception {
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("WARN");
        stubOrderAndLine("4", "4", "5");
        SalesDeliveryRequestVO payload = orderPayload("2");
        payload.setOverDeliveryConfirmed(true);
        when(dao.selectDelivery(anyMap())).thenReturn(storedOrderDelivery("2"));

        service.createDelivery(71L, "user01", payload);

        verify(dao).adjustShippedQty(argThat(p -> new BigDecimal("2.00").equals(p.get("deltaQty"))));
        verify(dao).adjustPlanDeliveredQty(argThat(p -> new BigDecimal("2.00").equals(p.get("deltaQty"))));
        verify(dao).insertDeliveryHeader(anyMap());
    }

    @Test
    void confirmationCannotBypassBlockOrChangedPolicyOnRetry() throws Exception {
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("WARN", "BLOCK");
        stubOrderAndLine("4", "4", "4");
        SalesDeliveryRequestVO payload = orderPayload("1");
        assertStatus(HttpStatus.CONFLICT, () -> service.createDelivery(71L, "user01", payload));
        payload.setOverDeliveryConfirmed(true);

        assertThatThrownBy(() -> service.createDelivery(71L, "user01", payload))
                .isInstanceOfSatisfying(ResponseStatusException.class, error ->
                        assertThat(error.getReason()).doesNotStartWith("[OVER_DELIVERY_CONFIRM_REQUIRED]"));
        verify(dao, never()).insertDeliveryHeader(anyMap());
    }

    @Test
    void sumsSplitPlansAgainstSingleOrderDetailEvenWhenEachPlanFits() throws Exception {
        stubOrderAndLine("10", "10", "0");
        SalesDeliverySourceOrderVO first = sourceLine("10", "10", "0");
        first.setShippedQty(new BigDecimal("2"));
        SalesDeliverySourceOrderVO second = sourceLine("10", "10", "0");
        second.setShippedQty(new BigDecimal("2"));
        second.setSalesDeliveryPlanDetailId(901L);
        when(dao.selectSourcePlanDetail(anyMap())).thenReturn(first, second);
        SalesDeliveryRequestVO payload = orderPayload("5");
        SalesDeliveryDetailRequestVO other = orderDetail("4");
        other.setSalesDeliveryPlanDetailId(901L);
        payload.setDetails(Arrays.asList(payload.getDetails().get(0), other));

        assertThatThrownBy(() -> service.createDelivery(71L, "user01", payload))
                .isInstanceOfSatisfying(ResponseStatusException.class, error ->
                        assertThat(error.getReason()).contains("수주", "저장후누적 11", "초과수량 1"));
        verify(dao, never()).insertDeliveryHeader(anyMap());
    }

    @Test
    void warnUpdateSubtractsOwnContributionAndDeleteReversesExcess() throws Exception {
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("WARN");
        SalesDeliveryVO stored = storedOrderDelivery("6");
        when(dao.selectDelivery(anyMap())).thenReturn(stored);
        when(dao.lockDeliveryHeader(anyMap())).thenReturn(stored);
        when(dao.selectDeliveryDetails(anyMap())).thenReturn(stored.getDetails());
        stubOrderAndLine("4", "4", "6");
        when(dao.updateDeliveryHeader(anyMap())).thenReturn(1);
        when(dao.softDeleteDeliveryHeader(anyMap())).thenReturn(1);

        service.updateDelivery(71L, "user01", 501L, orderPayload("4"));
        service.deleteDelivery(71L, "user01", 501L);

        verify(dao).adjustShippedQty(argThat(p -> new BigDecimal("-2.00").equals(p.get("deltaQty"))));
        verify(dao).adjustPlanDeliveredQty(argThat(p -> new BigDecimal("-2.00").equals(p.get("deltaQty"))));
        verify(dao).adjustShippedQty(argThat(p -> new BigDecimal("-6.00").equals(p.get("deltaQty"))));
        verify(dao).adjustPlanDeliveredQty(argThat(p -> new BigDecimal("-6.00").equals(p.get("deltaQty"))));
    }

    @Test
    void warnConfirmationStillRejectsInvalidReferenceAndNumericOverflow() throws Exception {
        when(planService.getOverDeliveryPolicy(71L)).thenReturn("WARN");
        stubOrderAndLine("4", "4", "4");
        SalesDeliveryRequestVO payload = orderPayload("10000000000000");
        payload.setOverDeliveryConfirmed(true);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createDelivery(71L, "user01", payload));
        payload.getDetails().get(0).setDeliveryQty(BigDecimal.ONE);
        when(dao.selectSourcePlanDetail(anyMap())).thenReturn(null);
        assertStatus(HttpStatus.CONFLICT, () -> service.createDelivery(71L, "user01", payload));
        verify(dao, never()).insertDeliveryHeader(anyMap());
    }

    @Test
    void rejectsDuplicateOrderDetailReferences() throws Exception {
        SalesDeliveryRequestVO payload = orderPayload("1");
        payload.setDetails(Arrays.asList(orderDetail("2"), orderDetail("1")));

        assertStatus(HttpStatus.BAD_REQUEST, () ->
                service.createDelivery(71L, "user01", payload));

        verifyNoInteractions(dao);
    }

    @Test
    void rejectsTamperedMaterialForOrderDetail() throws Exception {
        SalesDeliveryRequestVO payload = orderPayload("1");
        payload.getDetails().get(0).setMaterialId(99L);
        stubOrderAndLine("10", "4", "0");

        assertStatus(HttpStatus.CONFLICT, () ->
                service.createDelivery(71L, "user01", payload));

        verify(dao, never()).insertDeliveryHeader(anyMap());
    }

    @Test
    void updateRestoresOwnShippedQtyBeforeCheckingNewRemainder() throws Exception {
        SalesDeliveryVO stored = storedOrderDelivery("3");
        when(dao.selectDelivery(anyMap())).thenReturn(stored);
        when(dao.lockDeliveryHeader(anyMap())).thenReturn(stored);
        when(dao.selectDeliveryDetails(anyMap()))
                .thenReturn(Collections.singletonList(stored.getDetails().get(0)));
        when(dao.lockSourceOrder(anyMap())).thenReturn(orderSnapshot());
        when(dao.selectSourcePlanDetail(anyMap())).thenReturn(sourceLine("4", "4", "3"));
        when(dao.updateDeliveryHeader(anyMap())).thenReturn(1);
        when(dao.selectDelivery(anyMap())).thenReturn(stored);
        when(dao.selectDeliveryDetails(anyMap()))
                .thenReturn(Collections.singletonList(stored.getDetails().get(0)));

        SalesDeliveryRequestVO payload = orderPayload("4");
        SalesDeliveryVO updated = service.updateDelivery(71L, "user01", 501L, payload);

        assertThat(updated.getSalesDeliveryId()).isEqualTo(501L);
        verify(dao).adjustShippedQty(argThat(params ->
                new BigDecimal("1.00").equals(params.get("deltaQty"))));
        org.mockito.InOrder lockOrder = inOrder(dao);
        lockOrder.verify(dao).selectDelivery(anyMap());
        lockOrder.verify(dao).lockSourceOrder(anyMap());
        lockOrder.verify(dao).lockDeliveryHeader(anyMap());
    }

    @Test
    void rejectsChangingLinkedOrderOnUpdate() throws Exception {
        SalesDeliveryVO stored = storedOrderDelivery("2");
        when(dao.selectDelivery(anyMap())).thenReturn(stored);
        when(dao.lockDeliveryHeader(anyMap())).thenReturn(stored);
        SalesDeliveryRequestVO payload = orderPayload("2");
        payload.setSalesOrderId(301L);

        assertStatus(HttpStatus.CONFLICT, () ->
                service.updateDelivery(71L, "user01", 501L, payload));

        verify(dao, never()).lockSourceOrder(anyMap());
        verify(dao, never()).updateDeliveryHeader(anyMap());
    }

    @Test
    void rejectsNonpositiveDeliveryIdBeforeReadingDocument() {
        assertStatus(HttpStatus.BAD_REQUEST, () ->
                service.getDelivery(71L, "user01", 0L));

        verifyNoInteractions(dao);
    }

    @Test
    void deleteReversesLinkedQuantityAndRepeatedDeleteReturnsNotFound() throws Exception {
        SalesDeliveryVO stored = storedOrderDelivery("2");
        when(dao.selectDelivery(anyMap())).thenReturn(stored);
        when(dao.lockDeliveryHeader(anyMap())).thenReturn(stored, null);
        when(dao.selectDeliveryDetails(anyMap()))
                .thenReturn(Collections.singletonList(stored.getDetails().get(0)));
        when(dao.lockSourceOrder(anyMap())).thenReturn(orderSnapshot());
        when(dao.softDeleteDeliveryHeader(anyMap())).thenReturn(1);

        service.deleteDelivery(71L, "user01", 501L);

        verify(dao).adjustShippedQty(argThat(params ->
                new BigDecimal("-2.00").equals(params.get("deltaQty"))));
        org.mockito.InOrder lockOrder = inOrder(dao);
        lockOrder.verify(dao).selectDelivery(anyMap());
        lockOrder.verify(dao).lockSourceOrder(anyMap());
        lockOrder.verify(dao).lockDeliveryHeader(anyMap());
        assertStatus(HttpStatus.NOT_FOUND, () ->
                service.deleteDelivery(71L, "user01", 501L));
    }

    @Test
    void requiresPrincipalAndDateBoundStatusPeriod() throws Exception {
        assertStatus(HttpStatus.UNAUTHORIZED, () ->
                service.listStatus(null, "user01", new SalesDeliveryStatusSearchVO()));
        SalesDeliveryStatusSearchVO search = new SalesDeliveryStatusSearchVO();
        search.setDeliveryDtFrom("2026-11-01");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.listStatus(71L, "user01", search));
        verify(dao, never()).selectDeliveryStatus(anyMap());
    }

    @Test
    void statusSearchParsesRequiredDateBoundsAndScopesTenant() throws Exception {
        when(dao.selectDeliveryStatus(anyMap())).thenReturn(Collections.emptyList());
        SalesDeliveryStatusSearchVO search = new SalesDeliveryStatusSearchVO();
        search.setDeliveryDtFrom("2026-11-01");
        search.setDeliveryDtTo("2026-11-30");

        service.listStatus(72L, "user02", search);

        verify(dao).selectDeliveryStatus(argThat(params ->
                Long.valueOf(72L).equals(params.get("tenantId"))
                        && "user02".equals(params.get("userId"))
                        && LocalDate.of(2026, 11, 1).equals(params.get("deliveryDtFrom"))
                        && LocalDate.of(2026, 11, 30).equals(params.get("deliveryDtTo"))));
    }

    @Test
    void sourceOrdersAreLimitedToTenantAnd200RowsAtDaoBoundary() throws Exception {
        when(dao.selectSourceOrders(anyMap())).thenReturn(Collections.<SalesDeliverySourceOrderVO>emptyList());

        service.listSourceOrders(71L, "SO");

        verify(dao).selectSourceOrders(argThat(params ->
                Long.valueOf(71L).equals(params.get("tenantId"))
                        && Integer.valueOf(200).equals(params.get("limit"))
                        && "SO".equals(params.get("keyword"))));
    }

    private void stubOrderAndLine(String orderQty, String lineQty, String deliveredQty) throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(orderSnapshot());
        when(dao.selectSourcePlanDetail(anyMap())).thenReturn(sourceLine(orderQty, lineQty, deliveredQty));
    }

    private SalesDeliverySourceOrderHeaderVO orderSnapshot() {
        SalesDeliverySourceOrderHeaderVO order = new SalesDeliverySourceOrderHeaderVO();
        order.setSalesOrderId(300L);
        order.setCustomerId(10L);
        order.setStatus("수주등록");
        return order;
    }

    private SalesDeliverySourceOrderVO sourceLine(String orderQty, String plannedQty, String deliveredQty) {
        SalesDeliverySourceOrderVO line = new SalesDeliverySourceOrderVO();
        line.setSalesOrderId(300L);
        line.setSalesOrderDetailId(400L);
        line.setSalesDeliveryPlanDetailId(900L);
        line.setCustomerId(10L);
        line.setMaterialId(20L);
        line.setOrderQty(new BigDecimal(orderQty));
        line.setShippedQty(new BigDecimal(deliveredQty));
        line.setPlannedQty(new BigDecimal(plannedQty));
        line.setDeliveredQty(new BigDecimal(deliveredQty));
        line.setRemainingQty(new BigDecimal(plannedQty).subtract(new BigDecimal(deliveredQty)));
        line.setUnitPrice(new BigDecimal("2"));
        return line;
    }

    private SalesDeliveryVO storedOrderDelivery(String quantity) {
        SalesDeliveryVO delivery = new SalesDeliveryVO();
        delivery.setSalesDeliveryId(501L);
        delivery.setDeliveryType("ORDER");
        delivery.setCustomerId(10L);
        delivery.setSalesOrderId(300L);
        delivery.setDeliveryDt(LocalDate.of(2026, 11, 4));
        delivery.setDetails(Collections.singletonList(storedDetail(quantity)));
        return delivery;
    }

    private egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailVO storedDetail(String quantity) {
        egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailVO detail =
                new egovframework.let.sales.delivery.domain.model.SalesDeliveryDetailVO();
        detail.setMaterialId(20L);
        detail.setSalesOrderId(300L);
        detail.setSalesOrderDetailId(400L);
        detail.setSalesDeliveryPlanDetailId(900L);
        detail.setDeliveryQty(new BigDecimal(quantity).setScale(2));
        return detail;
    }

    private SalesDeliveryRequestVO directPayload() {
        SalesDeliveryRequestVO payload = new SalesDeliveryRequestVO();
        payload.setDeliveryDt(LocalDate.of(2026, 11, 4));
        payload.setDeliveryType("DIRECT");
        payload.setCustomerId(10L);
        payload.setDetails(Collections.singletonList(directDetail()));
        return payload;
    }

    private SalesDeliveryRequestVO orderPayload(String quantity) {
        SalesDeliveryRequestVO payload = directPayload();
        payload.setDeliveryType("ORDER");
        payload.setSalesOrderId(300L);
        payload.setDetails(Collections.singletonList(orderDetail(quantity)));
        return payload;
    }

    private SalesDeliveryDetailRequestVO directDetail() {
        SalesDeliveryDetailRequestVO detail = new SalesDeliveryDetailRequestVO();
        detail.setMaterialId(20L);
        detail.setDeliveryQty(new BigDecimal("2"));
        detail.setUnitPrice(new BigDecimal("2"));
        detail.setVatAmt(new BigDecimal("1"));
        return detail;
    }

    private SalesDeliveryDetailRequestVO orderDetail(String quantity) {
        SalesDeliveryDetailRequestVO detail = directDetail();
        detail.setSalesOrderDetailId(400L);
        detail.setSalesDeliveryPlanDetailId(900L);
        detail.setDeliveryQty(new BigDecimal(quantity));
        return detail;
    }

    private void assertStatus(HttpStatus status, org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(status);
    }
}
