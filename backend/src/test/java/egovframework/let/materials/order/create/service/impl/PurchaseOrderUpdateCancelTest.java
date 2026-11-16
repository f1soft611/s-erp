package egovframework.let.materials.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderConfirmRowVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

class PurchaseOrderUpdateCancelTest {

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
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("Y", "CONFIRM"));
        when(orderDAO.selectOrderDetails(anyMap())).thenReturn(Arrays.asList(
                existing(11L, 1, 51L, "10", "1000"), existing(12L, 2, 52L, "5", "2000"),
                existing(13L, 3, 53L, "2", "500")));
        when(orderDAO.selectOrder(anyMap())).thenReturn(new PurchaseOrderVO());
        when(orderDAO.updateOrderDetail(anyMap())).thenReturn(1);
        when(orderDAO.deleteOrderDetail(anyMap())).thenReturn(1);
        when(orderDAO.updateOrderHeader(anyMap())).thenReturn(1);
        when(orderDAO.cancelOrderHeader(anyMap())).thenReturn(1);
        when(orderDAO.selectConfirmRows(anyMap())).thenAnswer(invocation -> {
            Map<String, Object> params = invocation.getArgument(0);
            List<PurchaseOrderConfirmRowVO> rows = new ArrayList<PurchaseOrderConfirmRowVO>();
            for (Object id : (List<?>) params.get("detailIds")) {
                PurchaseOrderConfirmRowVO row = new PurchaseOrderConfirmRowVO();
                row.setPurchaseRequestDetailId((Long) id);
                row.setPurchaseConfirmId(900L);
                row.setConfirmQty(new BigDecimal("10"));
                row.setOrderedQty(new BigDecimal("0"));
                rows.add(row);
            }
            return rows;
        });
        when(confirmDAO.selectDetailLocks(anyMap())).thenAnswer(invocation -> {
            Map<String, Object> params = invocation.getArgument(0);
            List<PurchaseRequestDetailLockVO> locks = new ArrayList<PurchaseRequestDetailLockVO>();
            for (Object id : (List<?>) params.get("detailIds")) {
                PurchaseRequestDetailLockVO lock = new PurchaseRequestDetailLockVO();
                lock.setPurchaseRequestDetailId((Long) id);
                lock.setPurchaseRequestId(300L);
                locks.add(lock);
            }
            return locks;
        });
    }

    @Test
    void updatesRowValuesRecalculatesAmountsAndRenumbersAfterDeletingRows() throws Exception {
        PurchaseOrderSaveRequestVO payload = payload(
                line(13L, "2", "500"), line(11L, "20", "1000"));
        payload.setRemark(" 수정 ");
        PurchaseOrderVO result = service.updateOrder(TENANT, USER, ORDER_ID, payload);

        ArgumentCaptor<Map<String, Object>> deleted = mapCaptor();
        verify(orderDAO).deleteOrderDetail(deleted.capture());
        assertThat(deleted.getValue()).containsEntry("purchaseOrderDetailId", 12L);
        verify(orderDAO, never()).deleteAutoRequestDetail(anyMap());

        ArgumentCaptor<Map<String, Object>> updated = mapCaptor();
        verify(orderDAO, times(2)).updateOrderDetail(updated.capture());
        // 기존 행번호 오름차순(11 → 13)으로 1, 2를 다시 매긴다.
        assertThat(updated.getAllValues().get(0)).containsEntry("purchaseOrderDetailId", 11L).containsEntry("lineNo", 1);
        assertThat(updated.getAllValues().get(1)).containsEntry("purchaseOrderDetailId", 13L).containsEntry("lineNo", 2);
        assertThat((BigDecimal) updated.getAllValues().get(0).get("supplyAmt")).isEqualByComparingTo("20000.00");
        assertThat((BigDecimal) updated.getAllValues().get(0).get("vatAmt")).isEqualByComparingTo("2000.00");

        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(orderDAO).updateOrderHeader(header.capture());
        assertThat(header.getValue()).containsEntry("remark", "수정").containsEntry("updatedBy", USER);
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("21000.00");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("23100.00");
        InOrder order = inOrder(orderDAO);
        order.verify(orderDAO).deleteOrderDetail(anyMap());
        order.verify(orderDAO, times(2)).updateOrderDetail(anyMap());
        order.verify(orderDAO).updateOrderHeader(anyMap());
        assertThat(result.getOverOrderedLineNos()).isEmpty();
    }

    @Test
    void directOrderSyncsAutoRequestRowsAndConfirmTotal() throws Exception {
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("Y", "DIRECT"));
        service.updateOrder(TENANT, USER, ORDER_ID, payload(line(11L, "20", "1000"), line(13L, "2", "500")));

        ArgumentCaptor<Map<String, Object>> autoDelete = mapCaptor();
        verify(orderDAO).deleteAutoRequestDetail(autoDelete.capture());
        assertThat(autoDelete.getValue()).containsEntry("purchaseRequestDetailId", 52L);
        ArgumentCaptor<Map<String, Object>> autoUpdate = mapCaptor();
        verify(orderDAO, times(2)).updateAutoRequestDetail(autoUpdate.capture());
        assertThat(autoUpdate.getAllValues().get(0)).containsEntry("purchaseRequestDetailId", 51L);
        assertThat((BigDecimal) autoUpdate.getAllValues().get(0).get("amount")).isEqualByComparingTo("20000.00");
        verify(orderDAO).refreshConfirmTotal(anyMap());
        ArgumentCaptor<Map<String, Object>> refresh = mapCaptor();
        verify(confirmDAO).refreshRequestStatuses(refresh.capture());
        assertThat(refresh.getValue().get("purchaseRequestIds")).isEqualTo(Collections.singletonList(300L));
    }

    @Test
    void confirmOrderUpdateReportsOverOrderedRowsWithoutBlocking() throws Exception {
        doReturn(Arrays.asList(confirmRow(51L, "10", "0"), confirmRow(53L, "10", "0")),
                Arrays.asList(confirmRow(51L, "10", "30"), confirmRow(53L, "10", "2")))
                .when(orderDAO).selectConfirmRows(anyMap());
        PurchaseOrderVO result = service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "30", "1000"), line(13L, "2", "500")));
        assertThat(result.getOverOrderedLineNos()).containsExactly(1);
    }

    @Test
    void rejectsRemovingAllRowsUnknownDuplicateRowsAndCanceledOrders() throws Exception {
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(line(99L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID,
                payload(line(11L, "1", "1"), line(11L, "2", "1"))), HttpStatus.BAD_REQUEST);
        PurchaseOrderSaveRequestVO exempt = payload(line(11L, "1", "1"));
        exempt.setTaxType("EXEMPT");
        exempt.setVatIncludedAt("Y");
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID, exempt), HttpStatus.BAD_REQUEST);
        verify(orderDAO, never()).deleteOrderDetail(anyMap());
        verify(orderDAO, never()).updateOrderHeader(anyMap());

        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("N", "CONFIRM"));
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(line(11L, "1", "1"))),
                HttpStatus.CONFLICT);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.updateOrder(TENANT, USER, ORDER_ID, payload(line(11L, "1", "1"))),
                HttpStatus.NOT_FOUND);
    }

    @Test
    void cancelOfConfirmOrderOnlyDeactivatesTheOrder() throws Exception {
        service.cancelOrder(TENANT, USER, ORDER_ID);
        ArgumentCaptor<Map<String, Object>> cancel = mapCaptor();
        verify(orderDAO).cancelOrderHeader(cancel.capture());
        assertThat(cancel.getValue()).containsEntry("purchaseOrderId", ORDER_ID).containsEntry("updatedBy", USER);
        verify(confirmDAO, never()).clearDetailsByConfirm(anyMap());
        verify(confirmDAO, never()).cancelConfirmHeader(anyMap());
        verify(requestDAO, never()).softDeleteRequestHeader(anyMap());
    }

    @Test
    void cancelOfDirectOrderCancelsAutoConfirmAndRequest() throws Exception {
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("Y", "DIRECT"));
        service.cancelOrder(TENANT, USER, ORDER_ID);

        InOrder order = inOrder(orderDAO, confirmDAO, requestDAO);
        order.verify(orderDAO).cancelOrderHeader(anyMap());
        order.verify(confirmDAO).clearDetailsByConfirm(anyMap());
        order.verify(confirmDAO).cancelConfirmHeader(anyMap());
        order.verify(confirmDAO).refreshRequestStatuses(anyMap());
        order.verify(requestDAO).softDeleteRequestHeader(anyMap());
        ArgumentCaptor<Map<String, Object>> confirm = mapCaptor();
        verify(confirmDAO).clearDetailsByConfirm(confirm.capture());
        assertThat(confirm.getValue()).containsEntry("purchaseConfirmId", 900L).containsEntry("updatedBy", USER);
        ArgumentCaptor<Map<String, Object>> request = mapCaptor();
        verify(requestDAO).softDeleteRequestHeader(request.capture());
        assertThat(request.getValue()).containsEntry("purchaseRequestId", 300L);
    }

    @Test
    void cancelRejectsCanceledMissingAndUnauthenticated() throws Exception {
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("N", "CONFIRM"));
        assertStatus(() -> service.cancelOrder(TENANT, USER, ORDER_ID), HttpStatus.CONFLICT);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.cancelOrder(TENANT, USER, ORDER_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.cancelOrder(null, USER, ORDER_ID), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.cancelOrder(TENANT, " ", ORDER_ID), HttpStatus.UNAUTHORIZED);
        verify(orderDAO, never()).cancelOrderHeader(anyMap());
    }

    @Test
    void printDataIsReturnedForActiveOrdersWithDetails() throws Exception {
        egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO print =
                new egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO();
        print.setUseAt("Y");
        print.setOrderNo("PO-20261113-0001");
        when(orderDAO.selectOrderPrint(anyMap())).thenReturn(print);
        when(orderDAO.selectOrderPrintDetails(anyMap())).thenReturn(Collections.emptyList());
        egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO result =
                service.getPrintData(TENANT, ORDER_ID);
        assertThat(result.getOrderNo()).isEqualTo("PO-20261113-0001");
        assertThat(result.getDetails()).isEmpty();
    }

    @Test
    void printRejectsCanceledMissingAndUnauthenticatedOrders() throws Exception {
        egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO canceled =
                new egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO();
        canceled.setUseAt("N");
        when(orderDAO.selectOrderPrint(anyMap())).thenReturn(canceled);
        assertStatus(() -> service.getPrintData(TENANT, ORDER_ID), HttpStatus.CONFLICT);
        when(orderDAO.selectOrderPrint(anyMap())).thenReturn(null);
        assertStatus(() -> service.getPrintData(TENANT, ORDER_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.getPrintData(null, ORDER_ID), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.getPrintData(TENANT, null), HttpStatus.NOT_FOUND);
        verify(orderDAO, never()).selectOrderPrintDetails(anyMap());
    }

    @Test
    void printMarkRecordsThePrinterAndDoesNotTouchAnyOtherValue() throws Exception {
        when(orderDAO.updatePrintMark(anyMap())).thenReturn(1);
        service.markPrinted(TENANT, USER, ORDER_ID);
        ArgumentCaptor<Map<String, Object>> mark = mapCaptor();
        verify(orderDAO).updatePrintMark(mark.capture());
        assertThat(mark.getValue()).containsEntry("purchaseOrderId", ORDER_ID).containsEntry("printedBy", USER);
        verify(orderDAO, never()).updateOrderHeader(anyMap());
        verify(orderDAO, never()).updateOrderDetail(anyMap());
        verify(orderDAO, never()).updateReceiptClose(anyMap());
    }

    @Test
    void printMarkRejectsCanceledMissingAndUnauthenticatedOrders() throws Exception {
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("N", "CONFIRM"));
        assertStatus(() -> service.markPrinted(TENANT, USER, ORDER_ID), HttpStatus.CONFLICT);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.markPrinted(TENANT, USER, ORDER_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.markPrinted(null, USER, ORDER_ID), HttpStatus.UNAUTHORIZED);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("Y", "CONFIRM"));
        when(orderDAO.updatePrintMark(anyMap())).thenReturn(0);
        assertStatus(() -> service.markPrinted(TENANT, USER, ORDER_ID), HttpStatus.CONFLICT);
    }

    @Test
    void receiptCloseOnlyChangesTheCloseValueAndNothingElse() throws Exception {
        PurchaseOrderVO result = service.saveReceiptClose(TENANT, USER, ORDER_ID,
                closePayload(close(11L, "Y"), close(13L, "N")));

        ArgumentCaptor<Map<String, Object>> updated = mapCaptor();
        verify(orderDAO, times(2)).updateReceiptClose(updated.capture());
        assertThat(updated.getAllValues().get(0)).containsEntry("purchaseOrderDetailId", 11L)
                .containsEntry("receiptCloseAt", "Y").containsEntry("updatedBy", USER);
        assertThat(updated.getAllValues().get(1)).containsEntry("purchaseOrderDetailId", 13L)
                .containsEntry("receiptCloseAt", "N");
        // 수정 경로는 전혀 타지 않는다: 수량·단가·헤더 금액, 행 삭제, 확정·구매요청 변경 없음
        verify(orderDAO, never()).updateOrderDetail(anyMap());
        verify(orderDAO, never()).updateOrderHeader(anyMap());
        verify(orderDAO, never()).deleteOrderDetail(anyMap());
        verify(orderDAO, never()).updateAutoRequestDetail(anyMap());
        verify(confirmDAO, never()).refreshRequestStatuses(anyMap());
        assertThat(result).isNotNull();
    }

    @Test
    void receiptCloseRejectsInvalidRowsValuesCanceledAndMissingOrders() throws Exception {
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, closePayload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, null), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, closePayload(close(99L, "Y"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID,
                closePayload(close(11L, "Y"), close(11L, "N"))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, closePayload(close(11L, "X"))),
                HttpStatus.BAD_REQUEST);
        verify(orderDAO, never()).updateReceiptClose(anyMap());

        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(lockedOrder("N", "CONFIRM"));
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, closePayload(close(11L, "Y"))),
                HttpStatus.CONFLICT);
        when(orderDAO.selectOrderForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.saveReceiptClose(TENANT, USER, ORDER_ID, closePayload(close(11L, "Y"))),
                HttpStatus.NOT_FOUND);
        assertStatus(() -> service.saveReceiptClose(null, USER, ORDER_ID, closePayload(close(11L, "Y"))),
                HttpStatus.UNAUTHORIZED);
    }

    private egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO closePayload(
            egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO... details) {
        egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO payload =
                new egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO();
        payload.setDetails(new ArrayList<egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO>(
                Arrays.asList(details)));
        return payload;
    }

    private egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO close(Long id,
            String value) {
        egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO detail =
                new egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO();
        detail.setPurchaseOrderDetailId(id);
        detail.setReceiptCloseAt(value);
        return detail;
    }

    private PurchaseOrderVO lockedOrder(String useAt, String sourceType) {
        PurchaseOrderVO order = new PurchaseOrderVO();
        order.setPurchaseOrderId(ORDER_ID);
        order.setSupplierId(20L);
        order.setCurrencyCode("KRW");
        order.setSourceType(sourceType);
        order.setTaxType("TAXABLE");
        order.setVatIncludedAt("N");
        order.setUseAt(useAt);
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

    private PurchaseOrderConfirmRowVO confirmRow(Long detailId, String confirmQty, String orderedQty) {
        PurchaseOrderConfirmRowVO row = new PurchaseOrderConfirmRowVO();
        row.setPurchaseRequestDetailId(detailId);
        row.setPurchaseConfirmId(900L);
        row.setConfirmQty(new BigDecimal(confirmQty));
        row.setOrderedQty(new BigDecimal(orderedQty));
        return row;
    }

    private PurchaseOrderSaveRequestVO payload(PurchaseOrderDetailSaveRequestVO... lines) {
        PurchaseOrderSaveRequestVO payload = new PurchaseOrderSaveRequestVO();
        payload.setOrderDt(LocalDate.of(2026, 11, 13));
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("N");
        payload.setDetails(new ArrayList<PurchaseOrderDetailSaveRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseOrderDetailSaveRequestVO line(Long orderDetailId, String qty, String price) {
        PurchaseOrderDetailSaveRequestVO line = new PurchaseOrderDetailSaveRequestVO();
        line.setPurchaseOrderDetailId(orderDetailId);
        line.setOrderQty(new BigDecimal(qty));
        line.setUnitPrice(new BigDecimal(price));
        return line;
    }

    private void assertStatus(ThrowingCall call, HttpStatus status) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(status));
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
    }

    private interface ThrowingCall {
        void run() throws Exception;
    }
}
