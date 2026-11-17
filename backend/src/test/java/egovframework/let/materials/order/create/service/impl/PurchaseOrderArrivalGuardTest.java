package egovframework.let.materials.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderArrivalQtyVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderConfirmRowVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

/** 가입고가 있는 발주 행은 삭제·수량 축소·검사대상 변경·발주 취소를 할 수 없다(409). */
class PurchaseOrderArrivalGuardTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long ORDER_ID = 700L;

    @Mock
    private PurchaseOrderDAO orderDAO;
    @Mock
    private PurchaseRequestDAO requestDAO;
    @Mock
    private PurchaseRequestConfirmDAO confirmDAO;
    @Mock
    private IdSequenceService idSequenceService;

    private PurchaseOrderServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseOrderServiceImpl(orderDAO, requestDAO, confirmDAO, idSequenceService);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(true);
        when(orderDAO.existsTaxType(anyMap())).thenReturn(true);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder());
        when(orderDAO.selectOrderDetails(anyMap())).thenReturn(Arrays.asList(
                existing(11L, 1, 51L, "10", "1000"), existing(12L, 2, 52L, "5", "2000")));
        when(orderDAO.selectOrder(anyMap())).thenReturn(new PurchaseOrderVO());
        when(orderDAO.updateOrderDetail(anyMap())).thenReturn(1);
        when(orderDAO.deleteOrderDetail(anyMap())).thenReturn(1);
        when(orderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(orderDAO.cancelOrderHeader(anyMap())).thenReturn(1);
        when(orderDAO.selectConfirmRows(anyMap())).thenReturn(Collections.<PurchaseOrderConfirmRowVO>emptyList());
        when(orderDAO.selectArrivedQtyByOrderDetail(anyMap())).thenReturn(
                Arrays.asList(arrived(11L, "4")));
    }

    @Test
    void rejectsDeletingARowThatHasAnArrival() throws Exception {
        // 11(가입고 4)을 빼고 12만 남기는 요청
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(line(12L, "5", "2000", null))));
        verify(orderDAO, never()).deleteOrderDetail(anyMap());
        verify(orderDAO, never()).updateOrderHeader(anyMap());
    }

    @Test
    void rejectsReducingTheQuantityBelowTheArrivedQuantity() throws Exception {
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "3.99", "1000", null), line(12L, "5", "2000", null))));
        verify(orderDAO, never()).updateOrderHeader(anyMap());
    }

    @Test
    void allowsTheArrivedQuantityExactlyAndRowsWithoutArrival() throws Exception {
        service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "4", "1000", null), line(12L, "1", "2000", null)));
        verify(orderDAO).updateOrderHeader(anyMap());
    }

    @Test
    void rejectsChangingInspectAtOfARowThatHasAnArrival() throws Exception {
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "10", "1000", "Y"), line(12L, "5", "2000", null))));
        // 가입고가 없는 행은 검사대상을 바꿀 수 있다
        service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "10", "1000", "N"), line(12L, "5", "2000", "Y")));
        verify(orderDAO).updateOrderHeader(anyMap());
    }

    @Test
    void rejectsCancelingAnOrderThatHasAnArrival() throws Exception {
        assertConflict(() -> service.cancelOrder(TENANT, USER, ORDER_ID));
        verify(orderDAO, never()).cancelOrderHeader(anyMap());
        when(orderDAO.selectArrivedQtyByOrderDetail(anyMap()))
                .thenReturn(Collections.<PurchaseOrderArrivalQtyVO>emptyList());
        service.cancelOrder(TENANT, USER, ORDER_ID);
        verify(orderDAO).cancelOrderHeader(anyMap());
    }

    private PurchaseOrderArrivalQtyVO arrived(Long detailId, String qty) {
        PurchaseOrderArrivalQtyVO vo = new PurchaseOrderArrivalQtyVO();
        vo.setPurchaseOrderDetailId(detailId);
        vo.setArrivedQty(new BigDecimal(qty));
        return vo;
    }

    private PurchaseOrderVO lockedOrder() {
        PurchaseOrderVO order = new PurchaseOrderVO();
        order.setPurchaseOrderId(ORDER_ID);
        order.setSupplierId(20L);
        order.setCurrencyCode("KRW");
        order.setSourceType("CONFIRM");
        order.setTaxType("TAXABLE");
        order.setVatIncludedAt("N");
        order.setUseAt("Y");
        return order;
    }

    private PurchaseOrderDetailVO existing(Long id, int lineNo, Long requestDetailId, String qty, String price) {
        PurchaseOrderDetailVO detail = new PurchaseOrderDetailVO();
        detail.setPurchaseOrderDetailId(id);
        detail.setLineNo(lineNo);
        detail.setPurchaseRequestDetailId(requestDetailId);
        detail.setMaterialId(requestDetailId + 100);
        detail.setOrderQty(new BigDecimal(qty));
        detail.setUnitPrice(new BigDecimal(price));
        detail.setDeliveryDt(LocalDate.of(2026, 11, 24));
        detail.setWarehouseId(30L);
        detail.setOrderType("RAW_MATERIAL");
        detail.setUseType("PRODUCTION");
        detail.setInspectAt("N");
        return detail;
    }

    private PurchaseOrderSaveRequestVO payload(PurchaseOrderDetailSaveRequestVO... lines) {
        PurchaseOrderSaveRequestVO payload = new PurchaseOrderSaveRequestVO();
        payload.setOrderDt(LocalDate.of(2026, 11, 13));
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("N");
        payload.setDetails(new ArrayList<PurchaseOrderDetailSaveRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseOrderDetailSaveRequestVO line(Long orderDetailId, String qty, String price, String inspectAt) {
        PurchaseOrderDetailSaveRequestVO line = new PurchaseOrderDetailSaveRequestVO();
        line.setPurchaseOrderDetailId(orderDetailId);
        line.setOrderQty(new BigDecimal(qty));
        line.setUnitPrice(new BigDecimal(price));
        line.setInspectAt(inspectAt);
        return line;
    }

    private void assertConflict(ThrowingCall call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    private interface ThrowingCall {
        void run() throws Exception;
    }
}
