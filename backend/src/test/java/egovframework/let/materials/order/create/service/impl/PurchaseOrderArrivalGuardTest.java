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

/**
 * 가입고가 있는 발주 행은 값(수량·단가·납기·창고·검사대상)을 바꾸거나 삭제할 수 없고, 가입고가 하나라도 있으면
 * 발주일·부가세 설정도 바꿀 수 없다(비고만 가능). 발주 취소도 불가하다(모두 409).
 */
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
    void rejectsChangingAnyValueOfARowThatHasAnArrival() throws Exception {
        // 11(가입고 4): 수량 축소·증가, 단가, 납기, 창고, 검사대상 모두 거부
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "3.99", "1000", null), line(12L, "5", "2000", null))));
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "12", "1000", null), line(12L, "5", "2000", null))));
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "10", "1100", null), line(12L, "5", "2000", null))));
        PurchaseOrderDetailSaveRequestVO delivery = line(11L, "10", "1000", null);
        delivery.setDeliveryDt(LocalDate.of(2026, 12, 1));
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(delivery, line(12L, "5", "2000", null))));
        PurchaseOrderDetailSaveRequestVO warehouse = line(11L, "10", "1000", null);
        warehouse.setWarehouseId(31L);
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(warehouse, line(12L, "5", "2000", null))));
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "10", "1000", "Y"), line(12L, "5", "2000", null))));
        verify(orderDAO, never()).updateOrderHeader(anyMap());
        verify(orderDAO, never()).updateOrderDetail(anyMap());
    }

    @Test
    void allowsEditingRowsWithoutArrivalAndTheRemarkWhileAnArrivedRowStaysUnchanged() throws Exception {
        PurchaseOrderDetailSaveRequestVO arrivedRow = line(11L, "10", "1000", null);
        arrivedRow.setRemark("행 비고만 변경");
        PurchaseOrderSaveRequestVO request = payload(arrivedRow, line(12L, "1", "2100", "Y"));
        request.setRemark("헤더 비고만 변경");
        service.updateOrder(TENANT, USER, ORDER_ID, request);
        verify(orderDAO).updateOrderHeader(anyMap());
    }

    @Test
    void rejectsChangingTheHeaderDateOrTaxSettingWhenAnyRowHasAnArrival() throws Exception {
        PurchaseOrderSaveRequestVO date = payload(line(11L, "10", "1000", null), line(12L, "5", "2000", null));
        date.setOrderDt(LocalDate.of(2026, 11, 14));
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, date));
        PurchaseOrderSaveRequestVO tax = payload(line(11L, "10", "1000", null), line(12L, "5", "2000", null));
        tax.setTaxType("EXEMPT");
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, tax));
        PurchaseOrderSaveRequestVO vat = payload(line(11L, "10", "1000", null), line(12L, "5", "2000", null));
        vat.setVatIncludedAt("Y");
        assertConflict(() -> service.updateOrder(TENANT, USER, ORDER_ID, vat));
        verify(orderDAO, never()).updateOrderHeader(anyMap());
    }

    @Test
    void allowsChangingTheHeaderWhenNoRowHasAnArrival() throws Exception {
        when(orderDAO.selectArrivedQtyByOrderDetail(anyMap()))
                .thenReturn(Collections.<PurchaseOrderArrivalQtyVO>emptyList());
        PurchaseOrderSaveRequestVO date = payload(line(11L, "9", "1000", null), line(12L, "5", "2000", null));
        date.setOrderDt(LocalDate.of(2026, 11, 14));
        service.updateOrder(TENANT, USER, ORDER_ID, date);
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

    @Test
    void getOrderReportsTheArrivedQuantityPerRowSoTheScreenCanLockThem() throws Exception {
        PurchaseOrderVO order = lockedOrder();
        when(orderDAO.selectOrder(anyMap())).thenReturn(order);
        PurchaseOrderVO loaded = service.getOrder(TENANT, ORDER_ID);
        assertThat(loaded.getDetails()).extracting(PurchaseOrderDetailVO::getArrivedQty)
                .usingElementComparator(java.util.Comparator.nullsFirst(BigDecimal::compareTo))
                .containsExactly(new BigDecimal("4"), new BigDecimal("0"));
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
        order.setOrderDt(LocalDate.of(2026, 11, 13));
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
