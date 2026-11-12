package egovframework.let.sales.deliveryplan.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanDetailRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanDetailVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanStatusSearchVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanVO;
import egovframework.let.sales.deliveryplan.domain.repository.SalesDeliveryPlanDAO;

class SalesDeliveryPlanServiceImplTest {
    @Mock
    private SalesDeliveryPlanDAO dao;
    @Mock
    private IdSequenceService sequenceService;
    private SalesDeliveryPlanServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new SalesDeliveryPlanServiceImpl(dao, sequenceService);
        when(dao.selectTenantMode(71L)).thenReturn("MANUAL");
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("MANUAL");
    }

    @Test
    void manualCreationReadsModeUnderTenantShareLockBeforeLockingTheOrder() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("MANUAL");
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("AUTO");

        assertThatThrownBy(() -> service.create(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(dao, never()).lockSourceOrder(anyMap());
        verify(dao, never()).insertPlanHeader(anyMap());

        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("MANUAL");
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanVO saved = new SalesDeliveryPlanVO();
        saved.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(saved);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.insertPlanHeader(anyMap())).thenReturn(701L);
        when(dao.insertPlanDetail(anyMap())).thenReturn(801L);
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(1L);
        service.create(71L, "user01", request(detail(null, 801L, "1")));

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(dao);
        order.verify(dao, org.mockito.Mockito.times(2)).lockTenantModeForPlanCreation(71L);
        order.verify(dao).lockSourceOrder(anyMap());
        order.verify(dao).insertPlanHeader(anyMap());
        verify(dao, never()).selectTenantMode(71L);
    }

    @Test
    void automaticCreationRejectsModeChangedBeforeTheTenantShareLock() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("MANUAL");

        assertThatThrownBy(() -> service.createAutomaticPlan(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(dao, never()).lockSourceOrder(anyMap());
        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void automaticCreationDoesNotRequireReloadingTheInsertedPlanHeader() throws Exception {
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("AUTO");
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.insertPlanHeader(anyMap())).thenReturn(701L);
        when(dao.insertPlanDetail(anyMap())).thenReturn(801L);
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(1L);

        service.createAutomaticPlan(71L, "user01", request(detail(null, 801L, "10")));

        verify(dao, never()).selectPlanHeader(anyMap());
        verify(dao).insertPlanHeader(anyMap());
        verify(dao).insertPlanDetail(anyMap());
    }

    @Test
    void rejectsDeliveryPlanNumbersThatExceedTheSharedNumberLengthLimit() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(Long.MAX_VALUE);

        assertThatThrownBy(() -> service.create(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void generatesDeliveryPlanNumberWithDocumentPrefixDateAndFourDigitSequence() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanVO savedPlan = new SalesDeliveryPlanVO();
        savedPlan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(savedPlan);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.insertPlanHeader(anyMap())).thenReturn(701L);
        when(dao.insertPlanDetail(anyMap())).thenReturn(801L);
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(1L);

        service.create(71L, "user01", request(detail(null, 801L, "1")));

        String expectedPlanNo = "DP-" + LocalDate.now().toString().replace("-", "") + "-0001";
        verify(dao).insertPlanHeader(org.mockito.ArgumentMatchers.argThat(
                params -> expectedPlanNo.equals(params.get("planNo"))));
    }

    @Test
    void createsManualSplitPlanOnlyWithinTheOrderQuantity() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanVO savedPlan = new SalesDeliveryPlanVO();
        savedPlan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(savedPlan);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Arrays.asList(
                new SalesDeliveryPlanDetailVO(), new SalesDeliveryPlanDetailVO()));
        when(dao.insertPlanHeader(anyMap())).thenReturn(701L);
        when(dao.insertPlanDetail(anyMap())).thenReturn(801L, 802L);
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(1L);
        SalesDeliveryPlanRequestVO request = request(
                detail(null, 801L, "4"),
                detail(null, 801L, "6"));

        assertThat(service.create(71L, "user01", request).getDetails()).hasSize(2);
        verify(dao).insertPlanHeader(anyMap());
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                row -> new BigDecimal("4.00").equals(row.get("plannedQty"))));
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                row -> new BigDecimal("6.00").equals(row.get("plannedQty"))
                        && Long.valueOf(301L).equals(row.get("salesOrderId"))
                        && Long.valueOf(801L).equals(row.get("salesOrderDetailId"))));
        verify(dao, org.mockito.Mockito.times(2)).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                row -> Long.valueOf(301L).equals(row.get("salesOrderId"))
                        && Long.valueOf(801L).equals(row.get("salesOrderDetailId"))));
    }

    @Test
    void createsOneManualPlanFromSelectedDetailsAcrossOrdersAfterAscendingLocks() throws Exception {
        SalesDeliverySourceOrderHeaderVO secondOrder = order();
        secondOrder.setSalesOrderId(302L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order(), secondOrder);
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(org.mockito.ArgumentMatchers.argThat(
                params -> params != null && Long.valueOf(301L).equals(params.get("salesOrderId")))))
                .thenReturn(Collections.singletonList(orderLine()));
        SalesDeliveryPlanDetailVO secondOrderLine = orderLine();
        secondOrderLine.setSalesOrderId(302L);
        secondOrderLine.setSalesOrderDetailId(802L);
        when(dao.selectOrderLines(org.mockito.ArgumentMatchers.argThat(
                params -> params != null && Long.valueOf(302L).equals(params.get("salesOrderId")))))
                .thenReturn(Collections.singletonList(secondOrderLine));
        SalesDeliveryPlanVO saved = new SalesDeliveryPlanVO();
        saved.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(saved);
        when(dao.insertPlanHeader(anyMap())).thenReturn(701L);
        when(dao.insertPlanDetail(anyMap())).thenReturn(801L, 802L);
        when(sequenceService.nextValue(
                org.mockito.ArgumentMatchers.eq("SALES_DELIVERY_PLAN_NO"),
                org.mockito.ArgumentMatchers.eq("71"),
                org.mockito.ArgumentMatchers.anyString())).thenReturn(1L);
        SalesDeliveryPlanRequestVO request = request(
                detail(302L, null, 802L, "5"),
                detail(301L, null, 801L, "4"));

        SalesDeliveryPlanVO created = service.create(71L, "user01", request);

        assertThat(created.getSalesDeliveryPlanId()).isEqualTo(701L);
        verify(dao).insertPlanHeader(anyMap());
        verify(dao, org.mockito.Mockito.times(2)).insertPlanDetail(anyMap());
        org.mockito.InOrder order = org.mockito.Mockito.inOrder(dao);
        order.verify(dao).lockSourceOrder(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(301L).equals(params.get("salesOrderId"))));
        order.verify(dao).lockSourceOrder(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(302L).equals(params.get("salesOrderId"))));
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(301L).equals(params.get("salesOrderId"))
                        && Long.valueOf(801L).equals(params.get("salesOrderDetailId"))));
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(302L).equals(params.get("salesOrderId"))
                        && Long.valueOf(802L).equals(params.get("salesOrderDetailId"))));
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(
                params -> Long.valueOf(301L).equals(params.get("salesOrderId"))
                        && Long.valueOf(801L).equals(params.get("salesOrderDetailId"))));
    }

    @Test
    void rejectsOrderDetailPairThatDoesNotBelongToRequestedOrder() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));

        assertThatThrownBy(() -> service.create(71L, "user01",
                request(detail(301L, null, 899L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void rejectsProposedQtyAboveOrderDetailCapacityAcrossOtherPlans() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.sumOtherPlannedQty(anyMap())).thenReturn(new BigDecimal("5.00"));

        assertThatThrownBy(() -> service.create(71L, "user01",
                request(detail(301L, null, 801L, "6"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void rejectsManualPlanCreationForAutoTenant() throws Exception {
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("AUTO");

        assertThatThrownBy(() -> service.create(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void rejectsRepeatedExistingPlanDetailIdsDuringUpdate() throws Exception {
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        SalesDeliveryPlanDetailVO stored = orderLine();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setSalesDeliveryPlanId(701L);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setDeliveredQty(BigDecimal.ZERO);
        when(dao.selectPlanHeader(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        SalesDeliveryPlanDetailRequestVO first = detail(901L, 801L, "4");
        SalesDeliveryPlanDetailRequestVO second = detail(901L, 801L, "6");

        assertThatThrownBy(() -> service.update(71L, "user01", 701L, request(first, second)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(dao, never()).updatePlanDetail(anyMap());
        verify(dao, never()).insertPlanDetail(anyMap());
        verify(dao, never()).deletePlanDetail(anyMap());
    }

    @Test
    void allowsAutoPlanReadsAndStatusQueriesWithoutAllowingManualCreation() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        when(dao.lockTenantModeForPlanCreation(71L)).thenReturn("AUTO");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(plan);
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.emptyList());
        SalesDeliveryPlanStatusSearchVO search = new SalesDeliveryPlanStatusSearchVO();
        search.setPlanDtFrom("2026-11-01");
        search.setPlanDtTo("2026-11-30");

        assertThat(service.get(71L, "user01", 701L).getSalesDeliveryPlanId()).isEqualTo(701L);
        service.listStatus(71L, "user01", search);
        assertThat(service.listSourceOrders(71L, "SO-301")).isEmpty();
        assertThatThrownBy(() -> service.create(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(dao).selectPlanStatus(anyMap());
        verify(dao).selectPlanSourceOrders(org.mockito.ArgumentMatchers.argThat(
                params -> "AUTO".equals(params.get("deliveryPlanMode"))));
        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void permitsUpdatingAnExistingAutoPlan() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanDetailVO stored = orderLine();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setDeliveredQty(BigDecimal.ZERO);
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.countDeliveryReferences(anyMap())).thenReturn(0);
        when(dao.updatePlanDetail(anyMap())).thenReturn(1);

        SalesDeliveryPlanVO updated = service.update(71L, "user01", 701L, request(detail(901L, 801L, "8")));

        assertThat(updated.getSalesDeliveryPlanId()).isEqualTo(701L);
        verify(dao).updatePlanDetail(anyMap());
    }

    @Test
    void loadsPlanByOrderWithinAuthenticatedTenant() throws Exception {
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanByOrder(anyMap())).thenReturn(plan);
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.emptyList());

        assertThat(service.getByOrder(71L, "user01", 301L).getSalesDeliveryPlanId()).isEqualTo(701L);
        verify(dao).selectPlanByOrder(org.mockito.ArgumentMatchers.argThat(params ->
                Long.valueOf(71L).equals(params.get("tenantId"))
                        && Long.valueOf(301L).equals(params.get("salesOrderId"))));
    }

    @Test
    void rejectsPlanTotalAboveTheSourceOrderQuantity() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null);
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));

        assertThatThrownBy(() -> service.create(71L, "user01",
                request(detail(null, 801L, "6"), detail(null, 801L, "5"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void preservesAutoPlanQuantityAndDateWhenSynchronizingAnEditedOrder() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        SalesDeliveryPlanDetailVO line = orderLine();
        line.setLineNo(1);
        line.setOrderQty(new BigDecimal("8.00"));
        line.setPlanDt(LocalDate.of(2026, 11, 12));
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(line));
        SalesDeliveryPlanDetailVO stored = new SalesDeliveryPlanDetailVO();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setSalesOrderId(301L);
        stored.setSalesOrderDetailId(801L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setDeliveredQty(new BigDecimal("2.00"));
        stored.setPlanDt(LocalDate.of(2026, 11, 14));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));

        service.synchronizeAutomaticPlan(71L, "user01", 301L, Collections.singletonList(801L));

        verify(dao, never()).updatePlanDetail(anyMap());
        verify(dao, never()).insertPlanDetail(anyMap());
    }

    @Test
    void warnPreservesOriginalBaselineWhenUpdatingAnOverDeliveredManualPlan() throws Exception {
        when(dao.selectTenantOverDeliveryPolicy(71L)).thenReturn("WARN");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanHeader(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanDetailVO stored = orderLine();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10"));
        stored.setDeliveredQty(new BigDecimal("12"));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));
        when(dao.countDeliveryReferences(anyMap())).thenReturn(1);

        service.update(71L, "user01", 701L, request(detail(901L, 801L, "10")));

        verify(dao, never()).updatePlanDetail(anyMap());
        verify(dao, never()).deletePlanDetail(anyMap());
    }

    @Test
    void warnAutoSynchronizationPreservesAnExistingPlanBaseline() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        when(dao.selectTenantOverDeliveryPolicy(71L)).thenReturn("WARN");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        SalesDeliveryPlanDetailVO stored = orderLine();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setDeliveredQty(new BigDecimal("12.00"));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.selectOrderLines(anyMap())).thenReturn(Collections.singletonList(orderLine()));

        service.synchronizeAutomaticPlan(71L, "user01", 301L, Collections.singletonList(801L));

        verify(dao, never()).updatePlanDetail(anyMap());
    }

    @Test
    void autoSynchronizationCreatesAnInitialPlanOnlyForNewOrderLines() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        when(dao.selectPlanByOrder(anyMap())).thenReturn(plan);
        when(dao.lockPlanHeader(anyMap())).thenReturn(plan);
        SalesDeliveryPlanDetailVO existingLine = orderLine();
        existingLine.setLineNo(1);
        existingLine.setOrderQty(new BigDecimal("12.00"));
        SalesDeliveryPlanDetailVO newLine = orderLine();
        newLine.setSalesOrderDetailId(802L);
        newLine.setLineNo(2);
        newLine.setOrderQty(new BigDecimal("5.00"));
        newLine.setPlanDt(LocalDate.of(2026, 11, 20));
        when(dao.selectOrderLines(anyMap())).thenReturn(Arrays.asList(existingLine, newLine));
        SalesDeliveryPlanDetailVO stored = orderLine();
        stored.setSalesDeliveryPlanDetailId(901L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setPlanDt(LocalDate.of(2026, 11, 14));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.insertPlanDetail(anyMap())).thenReturn(902L);

        service.synchronizeAutomaticPlan(71L, "user01", 301L, Arrays.asList(801L, 802L));

        verify(dao, never()).updatePlanDetail(anyMap());
        verify(dao).insertPlanDetail(org.mockito.ArgumentMatchers.argThat(params ->
                Long.valueOf(301L).equals(params.get("salesOrderId"))
                        && Long.valueOf(802L).equals(params.get("salesOrderDetailId"))
                        && Integer.valueOf(2).equals(params.get("lineNo"))
                        && new BigDecimal("5.00").equals(params.get("plannedQty"))
                        && LocalDate.of(2026, 11, 20).equals(params.get("planDt"))));
    }

    private SalesDeliverySourceOrderHeaderVO order() {
        SalesDeliverySourceOrderHeaderVO order = new SalesDeliverySourceOrderHeaderVO();
        order.setSalesOrderId(301L);
        order.setCustomerId(41L);
        order.setStatus("수주등록");
        return order;
    }

    private SalesDeliveryPlanDetailVO orderLine() {
        SalesDeliveryPlanDetailVO line = new SalesDeliveryPlanDetailVO();
        line.setSalesOrderId(301L);
        line.setSalesOrderDetailId(801L);
        line.setMaterialId(51L);
        line.setOrderQty(new BigDecimal("10.00"));
        line.setShippedQty(BigDecimal.ZERO);
        return line;
    }

    private SalesDeliveryPlanRequestVO request(SalesDeliveryPlanDetailRequestVO... details) {
        SalesDeliveryPlanRequestVO request = new SalesDeliveryPlanRequestVO();
        for (SalesDeliveryPlanDetailRequestVO detail : details) {
            if (detail.getSalesOrderId() == null) {
                detail.setSalesOrderId(301L);
            }
        }
        request.setDetails(Arrays.asList(details));
        return request;
    }

    private SalesDeliveryPlanDetailRequestVO detail(Long planDetailId, Long orderDetailId, String quantity) {
        return detail(301L, planDetailId, orderDetailId, quantity);
    }

    private SalesDeliveryPlanDetailRequestVO detail(
            Long orderId, Long planDetailId, Long orderDetailId, String quantity) {
        SalesDeliveryPlanDetailRequestVO detail = new SalesDeliveryPlanDetailRequestVO();
        detail.setSalesOrderId(orderId);
        detail.setSalesDeliveryPlanDetailId(planDetailId);
        detail.setSalesOrderDetailId(orderDetailId);
        detail.setPlannedQty(new BigDecimal(quantity));
        return detail;
    }
}
