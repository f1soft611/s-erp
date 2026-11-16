package egovframework.let.materials.order.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
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
import egovframework.let.materials.order.create.domain.model.PurchaseOrderMaterialDefaultVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

class PurchaseOrderServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final LocalDate ORDER_DT = LocalDate.of(2026, 11, 13);
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
        PurchaseRequestRequesterVO requester = new PurchaseRequestRequesterVO();
        requester.setUserId(7L);
        requester.setDepartmentId(3L);
        when(requestDAO.selectRequester(anyMap())).thenReturn(requester);
        when(requestDAO.existsUseType(anyMap())).thenReturn(true);
        when(confirmDAO.existsSupplier(anyMap())).thenReturn(true);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(true);
        when(confirmDAO.existsOrderType(anyMap())).thenReturn(true);
        when(orderDAO.existsTaxType(anyMap())).thenReturn(true);
        when(orderDAO.insertOrderHeader(anyMap())).thenReturn(ORDER_ID);
        when(orderDAO.insertOrderDetail(anyMap())).thenReturn(1L);
        PurchaseOrderVO saved = new PurchaseOrderVO();
        when(orderDAO.selectOrder(anyMap())).thenReturn(saved);
        when(orderDAO.selectOrderDetails(anyMap())).thenReturn(Collections.emptyList());
        when(idSequenceService.nextValue("MATERIAL_ORDER_NO", "1", "20261113")).thenReturn(7L);
        when(idSequenceService.nextValue("MATERIAL_REQUEST_NO", "1", "20261113")).thenReturn(4L);
        when(idSequenceService.nextValue("MATERIAL_CONFIRM_NO", "1", "20261113")).thenReturn(5L);
        // 요청한 상세 ID만 돌려준다(행 51은 확정 10, 행 61은 확정 5, 기발주 없음)
        when(orderDAO.selectConfirmRows(anyMap())).thenAnswer(invocation -> {
            Map<String, Object> params = invocation.getArgument(0);
            List<PurchaseOrderConfirmRowVO> rows = new ArrayList<PurchaseOrderConfirmRowVO>();
            for (Object id : (List<?>) params.get("detailIds")) {
                Long detailId = (Long) id;
                rows.add(confirmRow(detailId, detailId == 51L ? "10" : "5", "0"));
            }
            return rows;
        });
    }

    @Test
    void savesConfirmedRowsWithLockedRowsAndSummedAmounts() throws Exception {
        PurchaseOrderVO result = service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(61L, "5", "200"), confirmLine(51L, "10", "100")));

        ArgumentCaptor<Map<String, Object>> lock = mapCaptor();
        verify(orderDAO, org.mockito.Mockito.atLeastOnce()).selectConfirmRows(lock.capture());
        assertThat(lock.getAllValues().get(0).get("detailIds")).isEqualTo(Arrays.asList(51L, 61L));
        assertThat(lock.getAllValues().get(0)).containsEntry("forUpdate", Boolean.TRUE);

        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(orderDAO).insertOrderHeader(header.capture());
        assertThat(header.getValue()).containsEntry("orderNo", "PO-20261113-0007")
                .containsEntry("sourceType", "CONFIRM").containsEntry("currencyCode", "KRW")
                .containsEntry("ordererId", 7L).containsEntry("orderDeptId", 3L)
                .containsEntry("taxType", "TAXABLE").containsEntry("vatIncludedAt", "N");
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("2000.00");
        assertThat((BigDecimal) header.getValue().get("vatAmt")).isEqualByComparingTo("200.00");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("2200.00");

        ArgumentCaptor<Map<String, Object>> details = mapCaptor();
        verify(orderDAO, org.mockito.Mockito.times(2)).insertOrderDetail(details.capture());
        assertThat(details.getAllValues().get(0)).containsEntry("lineNo", 1).containsEntry("purchaseRequestDetailId", 61L)
                .containsEntry("inspectAt", "N").containsEntry("orderType", "RAW_ORDER");
        assertThat(details.getAllValues().get(1)).containsEntry("lineNo", 2).containsEntry("purchaseRequestDetailId", 51L);
        verify(requestDAO, never()).insertRequestHeader(anyMap());
        assertThat(result.getOverOrderedLineNos()).isEmpty();
    }

    @Test
    void reportsRowsOrderedAboveConfirmedQuantityWithoutBlockingSave() throws Exception {
        doReturn(
                Arrays.asList(confirmRow(51L, "10", "0"), confirmRow(61L, "5", "0")),
                Arrays.asList(confirmRow(51L, "10", "12"), confirmRow(61L, "5", "5"))).when(orderDAO).selectConfirmRows(anyMap());
        PurchaseOrderVO result = service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "12", "100"), confirmLine(61L, "5", "200")));
        assertThat(result.getOverOrderedLineNos()).containsExactly(1);
    }

    @Test
    void rejectsClosedCanceledOrMissingConfirmRows() throws Exception {
        PurchaseOrderConfirmRowVO closed = confirmRow(51L, "10", "0");
        closed.setOrderCloseAt("Y");
        doReturn(Arrays.asList(closed, confirmRow(61L, "5", "0"))).when(orderDAO).selectConfirmRows(anyMap());
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "1", "1"), confirmLine(61L, "1", "1"))), HttpStatus.CONFLICT);

        PurchaseOrderConfirmRowVO canceled = confirmRow(51L, "10", "0");
        canceled.setConfirmUseAt("N");
        doReturn(Arrays.asList(canceled, confirmRow(61L, "5", "0"))).when(orderDAO).selectConfirmRows(anyMap());
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "1", "1"), confirmLine(61L, "1", "1"))), HttpStatus.CONFLICT);

        doReturn(Collections.singletonList(confirmRow(51L, "10", "0"))).when(orderDAO).selectConfirmRows(anyMap());
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "1", "1"), confirmLine(61L, "1", "1"))), HttpStatus.CONFLICT);
        verify(orderDAO, never()).insertOrderHeader(anyMap());
    }

    @Test
    void rejectsMixedCurrenciesDirectItemsInConfirmOrderAndDuplicates() throws Exception {
        PurchaseOrderConfirmRowVO usd = confirmRow(61L, "5", "0");
        usd.setCurrencyCode("USD");
        doReturn(Arrays.asList(confirmRow(51L, "10", "0"), usd)).when(orderDAO).selectConfirmRows(anyMap());
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "1", "1"), confirmLine(61L, "1", "1"))), HttpStatus.BAD_REQUEST);

        PurchaseOrderDetailSaveRequestVO direct = new PurchaseOrderDetailSaveRequestVO();
        direct.setMaterialId(9L);
        direct.setOrderQty(new BigDecimal("1"));
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(confirmLine(51L, "1", "1"), direct)),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(
                confirmLine(51L, "1", "1"), confirmLine(51L, "2", "1"))), HttpStatus.BAD_REQUEST);
        verify(idSequenceService, never()).nextValue("MATERIAL_ORDER_NO", "1", "20261113");
    }

    @Test
    void rejectsIncludedVatForNonTaxableAndInvalidInputs() throws Exception {
        PurchaseOrderSaveRequestVO exempt = confirmPayload(confirmLine(51L, "1", "1"));
        exempt.setTaxType("EXEMPT");
        exempt.setVatIncludedAt("Y");
        assertStatus(() -> service.createOrder(TENANT, USER, exempt), HttpStatus.BAD_REQUEST);

        PurchaseOrderSaveRequestVO zeroQty = confirmPayload(confirmLine(51L, "0", "1"));
        assertStatus(() -> service.createOrder(TENANT, USER, zeroQty), HttpStatus.BAD_REQUEST);

        PurchaseOrderSaveRequestVO noSource = confirmPayload(confirmLine(51L, "1", "1"));
        noSource.setSourceType("OTHER");
        assertStatus(() -> service.createOrder(TENANT, USER, noSource), HttpStatus.BAD_REQUEST);

        PurchaseOrderSaveRequestVO empty = confirmPayload();
        assertStatus(() -> service.createOrder(TENANT, USER, empty), HttpStatus.BAD_REQUEST);

        when(confirmDAO.existsSupplier(anyMap())).thenReturn(false);
        assertStatus(() -> service.createOrder(TENANT, USER, confirmPayload(confirmLine(51L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void taxableIncludedStoresSplitAmounts() throws Exception {
        PurchaseOrderSaveRequestVO payload = confirmPayload(confirmLine(51L, "10", "1100"));
        payload.setVatIncludedAt("Y");
        service.createOrder(TENANT, USER, payload);
        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(orderDAO).insertOrderDetail(detail.capture());
        assertThat((BigDecimal) detail.getValue().get("supplyAmt")).isEqualByComparingTo("10000.00");
        assertThat((BigDecimal) detail.getValue().get("vatAmt")).isEqualByComparingTo("1000.00");
        assertThat((BigDecimal) detail.getValue().get("totalAmt")).isEqualByComparingTo("11000.00");
    }

    @Test
    void directOrderCreatesRequestAndConfirmInTheSameFlowAndLinksRows() throws Exception {
        PurchaseOrderMaterialDefaultVO material = new PurchaseOrderMaterialDefaultVO();
        material.setMaterialId(9L);
        material.setMaterialTypeCode("RAW");
        material.setInspectAt("Y");
        when(orderDAO.selectMaterialDefault(anyMap())).thenReturn(material);
        when(requestDAO.insertRequestHeader(anyMap())).thenReturn(300L);
        when(requestDAO.insertRequestDetail(anyMap())).thenReturn(901L);
        when(confirmDAO.insertConfirmHeader(anyMap())).thenReturn(800L);
        when(confirmDAO.updateDetailConfirm(anyMap())).thenReturn(1);

        PurchaseOrderSaveRequestVO payload = directPayload();
        service.createOrder(TENANT, USER, payload);

        InOrder order = inOrder(requestDAO, confirmDAO, orderDAO);
        order.verify(requestDAO).insertRequestHeader(anyMap());
        order.verify(requestDAO).insertRequestDetail(anyMap());
        order.verify(confirmDAO).insertConfirmHeader(anyMap());
        order.verify(confirmDAO).updateDetailConfirm(anyMap());
        order.verify(confirmDAO).refreshRequestStatuses(anyMap());
        order.verify(orderDAO).insertOrderHeader(anyMap());
        order.verify(orderDAO).insertOrderDetail(anyMap());

        ArgumentCaptor<Map<String, Object>> request = mapCaptor();
        verify(requestDAO).insertRequestHeader(request.capture());
        assertThat(request.getValue()).containsEntry("requestNo", "MR-20261113-0004")
                .containsEntry("requesterId", 7L).containsEntry("status", "REQUESTED");
        ArgumentCaptor<Map<String, Object>> confirm = mapCaptor();
        verify(confirmDAO).insertConfirmHeader(confirm.capture());
        assertThat(confirm.getValue()).containsEntry("confirmNo", "MC-20261113-0005")
                .containsEntry("confirmerId", 7L).containsEntry("currencyCode", "KRW");
        ArgumentCaptor<Map<String, Object>> confirmDetail = mapCaptor();
        verify(confirmDAO).updateDetailConfirm(confirmDetail.capture());
        assertThat(confirmDetail.getValue()).containsEntry("purchaseConfirmId", 800L)
                .containsEntry("purchaseRequestDetailId", 901L).containsEntry("supplierId", 20L)
                .containsEntry("orderType", "RAW_ORDER");
        ArgumentCaptor<Map<String, Object>> orderDetail = mapCaptor();
        verify(orderDAO).insertOrderDetail(orderDetail.capture());
        assertThat(orderDetail.getValue()).containsEntry("purchaseRequestDetailId", 901L)
                .containsEntry("inspectAt", "Y").containsEntry("useType", "PRODUCTION");
        ArgumentCaptor<Map<String, Object>> orderHeader = mapCaptor();
        verify(orderDAO).insertOrderHeader(orderHeader.capture());
        assertThat(orderHeader.getValue()).containsEntry("sourceType", "DIRECT");
    }

    @Test
    void directOrderRequiresPurchasableMaterialOrderTypeAndUseType() throws Exception {
        PurchaseOrderMaterialDefaultVO product = new PurchaseOrderMaterialDefaultVO();
        product.setMaterialId(9L);
        product.setMaterialTypeCode("PRODUCT");
        product.setInspectAt("N");
        when(orderDAO.selectMaterialDefault(anyMap())).thenReturn(product);
        assertStatus(() -> service.createOrder(TENANT, USER, directPayload()), HttpStatus.BAD_REQUEST);

        PurchaseOrderSaveRequestVO noOrderType = directPayload();
        noOrderType.setOrderType(null);
        assertStatus(() -> service.createOrder(TENANT, USER, noOrderType), HttpStatus.BAD_REQUEST);
        PurchaseOrderSaveRequestVO noUseType = directPayload();
        noUseType.setUseType(null);
        assertStatus(() -> service.createOrder(TENANT, USER, noUseType), HttpStatus.BAD_REQUEST);
        verify(requestDAO, never()).insertRequestHeader(anyMap());
        verify(orderDAO, never()).insertOrderHeader(anyMap());
    }

    @Test
    void requiresAuthentication() {
        assertStatus(() -> service.createOrder(null, USER, confirmPayload(confirmLine(51L, "1", "1"))),
                HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createOrder(TENANT, " ", confirmPayload(confirmLine(51L, "1", "1"))),
                HttpStatus.UNAUTHORIZED);
    }

    private PurchaseOrderSaveRequestVO directPayload() {
        PurchaseOrderDetailSaveRequestVO line = new PurchaseOrderDetailSaveRequestVO();
        line.setMaterialId(9L);
        line.setOrderQty(new BigDecimal("4"));
        line.setUnitPrice(new BigDecimal("250"));
        line.setDeliveryDt(LocalDate.of(2026, 11, 20));
        line.setWarehouseId(30L);
        PurchaseOrderSaveRequestVO payload = new PurchaseOrderSaveRequestVO();
        payload.setSourceType("DIRECT");
        payload.setOrderDt(ORDER_DT);
        payload.setSupplierId(20L);
        payload.setOrderType("RAW_ORDER");
        payload.setUseType("PRODUCTION");
        payload.setDetails(new ArrayList<PurchaseOrderDetailSaveRequestVO>(Collections.singletonList(line)));
        return payload;
    }

    private PurchaseOrderSaveRequestVO confirmPayload(PurchaseOrderDetailSaveRequestVO... lines) {
        PurchaseOrderSaveRequestVO payload = new PurchaseOrderSaveRequestVO();
        payload.setSourceType("CONFIRM");
        payload.setOrderDt(ORDER_DT);
        payload.setSupplierId(20L);
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("N");
        payload.setDetails(new ArrayList<PurchaseOrderDetailSaveRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseOrderDetailSaveRequestVO confirmLine(Long detailId, String qty, String price) {
        PurchaseOrderDetailSaveRequestVO line = new PurchaseOrderDetailSaveRequestVO();
        line.setPurchaseRequestDetailId(detailId);
        line.setOrderQty(new BigDecimal(qty));
        line.setUnitPrice(new BigDecimal(price));
        return line;
    }

    private PurchaseOrderConfirmRowVO confirmRow(Long detailId, String confirmQty, String orderedQty) {
        PurchaseOrderConfirmRowVO row = new PurchaseOrderConfirmRowVO();
        row.setPurchaseRequestDetailId(detailId);
        row.setPurchaseConfirmId(900L);
        row.setConfirmUseAt("Y");
        row.setMaterialId(detailId + 100);
        row.setMaterialTypeCode("RAW");
        row.setInspectAt("N");
        row.setConfirmQty(new BigDecimal(confirmQty));
        row.setOrderedQty(new BigDecimal(orderedQty));
        row.setOrderCloseAt("N");
        row.setSupplierId(20L);
        row.setCurrencyCode("KRW");
        row.setOrderType("RAW_ORDER");
        row.setUseType("PRODUCTION");
        row.setWarehouseId(30L);
        row.setConfirmDeliveryDt(LocalDate.of(2026, 11, 20));
        return row;
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

    @SuppressWarnings("unused")
    private static List<Long> unused() {
        return Collections.emptyList();
    }
}
