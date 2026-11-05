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
    }

    @Test
    void createsManualSplitPlanOnlyWithinTheOrderQuantity() throws Exception {
        when(dao.lockSourceOrder(anyMap())).thenReturn(order());
        SalesDeliveryPlanVO savedPlan = new SalesDeliveryPlanVO();
        savedPlan.setSalesDeliveryPlanId(701L);
        when(dao.selectPlanByOrder(anyMap())).thenReturn(null, savedPlan);
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
                row -> new BigDecimal("6.00").equals(row.get("plannedQty"))));
    }

    @Test
    void rejectsManualPlanCreationForAutoTenant() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");

        assertThatThrownBy(() -> service.create(71L, "user01", request(detail(null, 801L, "1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(dao, never()).insertPlanHeader(anyMap());
    }

    @Test
    void blocksManualPlanReadsForAutoTenant() throws Exception {
        when(dao.selectTenantMode(71L)).thenReturn("AUTO");
        SalesDeliveryPlanStatusSearchVO search = new SalesDeliveryPlanStatusSearchVO();
        search.setPlanDtFrom("2026-11-01");
        search.setPlanDtTo("2026-11-30");

        assertThatThrownBy(() -> service.listStatus(71L, "user01", search))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThatThrownBy(() -> service.get(71L, "user01", 701L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(dao, never()).selectPlanHeader(anyMap());
        verify(dao, never()).selectPlanStatus(anyMap());
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
    void synchronizesAutoPlanQuantityAndDateWithoutLosingDeliveredQuantity() throws Exception {
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
        stored.setSalesOrderDetailId(801L);
        stored.setLineNo(1);
        stored.setPlannedQty(new BigDecimal("10.00"));
        stored.setDeliveredQty(new BigDecimal("2.00"));
        when(dao.selectPlanDetails(anyMap())).thenReturn(Collections.singletonList(stored));
        when(dao.updatePlanDetail(anyMap())).thenReturn(1);

        service.synchronizeAutomaticPlan(71L, "user01", 301L, Collections.singletonList(801L));

        verify(dao).updatePlanDetail(org.mockito.ArgumentMatchers.argThat(params ->
                Long.valueOf(901L).equals(params.get("salesDeliveryPlanDetailId"))
                        && new BigDecimal("8.00").equals(params.get("plannedQty"))
                        && new BigDecimal("2.00").equals(params.get("deliveredQty"))
                        && LocalDate.of(2026, 11, 12).equals(params.get("planDt"))));
    }

    @Test
    void warnPreservesOriginalBaselineWhenUpdatingAnOverDeliveredManualPlan() throws Exception {
        when(dao.selectTenantOverDeliveryPolicy(71L)).thenReturn("WARN");
        SalesDeliveryPlanVO plan = new SalesDeliveryPlanVO();
        plan.setSalesDeliveryPlanId(701L);
        plan.setSalesOrderId(301L);
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
    void warnAutoSynchronizationDoesNotInflateBaselineToActual() throws Exception {
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
        when(dao.updatePlanDetail(anyMap())).thenReturn(1);

        service.synchronizeAutomaticPlan(71L, "user01", 301L, Collections.singletonList(801L));

        verify(dao).updatePlanDetail(org.mockito.ArgumentMatchers.argThat(params ->
                new BigDecimal("10.00").equals(params.get("plannedQty"))
                        && new BigDecimal("12.00").equals(params.get("deliveredQty"))));
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
        request.setSalesOrderId(301L);
        request.setDetails(Arrays.asList(details));
        return request;
    }

    private SalesDeliveryPlanDetailRequestVO detail(Long planDetailId, Long orderDetailId, String quantity) {
        SalesDeliveryPlanDetailRequestVO detail = new SalesDeliveryPlanDetailRequestVO();
        detail.setSalesDeliveryPlanDetailId(planDetailId);
        detail.setSalesOrderDetailId(orderDetailId);
        detail.setPlannedQty(new BigDecimal(quantity));
        return detail;
    }
}
