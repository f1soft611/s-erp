package egovframework.let.materials.receipt.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalDetailVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalVO;
import egovframework.let.materials.arrival.create.domain.repository.PurchaseArrivalDAO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;
import egovframework.let.materials.receipt.create.domain.repository.PurchaseReceiptDAO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

class PurchaseReceiptServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long RECEIPT_ID = 900L;
    private static final Long ARRIVAL_ID = 800L;
    private static final LocalDate RECEIPT_DT = LocalDate.of(2026, 11, 17);

    @Mock
    private PurchaseReceiptDAO receiptDAO;
    @Mock
    private PurchaseArrivalDAO arrivalDAO;
    @Mock
    private PurchaseOrderDAO orderDAO;
    @Mock
    private PurchaseRequestConfirmDAO confirmDAO;
    @Mock
    private PurchaseRequestDAO requestDAO;
    @Mock
    private IdSequenceService idSequenceService;

    private PurchaseReceiptServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseReceiptServiceImpl(receiptDAO, arrivalDAO, orderDAO, confirmDAO, requestDAO, idSequenceService);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(true);
        when(orderDAO.existsTaxType(anyMap())).thenReturn(true);
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(1L);
        when(receiptDAO.insertReceiptHeader(anyMap())).thenReturn(RECEIPT_ID);
        when(receiptDAO.insertReceiptDetail(anyMap())).thenReturn(901L);
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(lockedReceipt("Y"));
        when(receiptDAO.selectReceipt(anyMap())).thenReturn(new PurchaseReceiptVO());
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(
                receiptRow(71L, 1, 21L, "5", "1000", "N"), receiptRow(72L, 2, 22L, "2", "2000", "N")));
        when(receiptDAO.updateReceiptHeader(anyMap())).thenReturn(1);
        when(receiptDAO.updateReceiptDetail(anyMap())).thenReturn(1);
        when(receiptDAO.deleteReceiptDetail(anyMap())).thenReturn(1);
        when(receiptDAO.cancelReceiptHeader(anyMap())).thenReturn(1);

        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(new PurchaseArrivalVO());
        when(arrivalDAO.selectArrival(anyMap())).thenReturn(arrival());
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                arrivalRow(21L, 1, 11L, "5", "1000", "N", "행1 비고"), arrivalRow(22L, 2, 12L, "2", "2000", "N", null),
                arrivalRow(23L, 3, 13L, "1", "500", "Y", null)));
        when(arrivalDAO.updateArrivalHeader(anyMap())).thenReturn(1);
        when(arrivalDAO.updateArrivalDetail(anyMap())).thenReturn(1);
        when(arrivalDAO.updateArrivalDetailLineNo(anyMap())).thenReturn(1);
        when(arrivalDAO.deleteArrivalDetail(anyMap())).thenReturn(1);
        when(arrivalDAO.cancelArrivalHeader(anyMap())).thenReturn(1);
    }

    // ---- 무검사 자동 입고 ----

    @Test
    void createsAReceiptOnlyFromTheNoInspectionRowsOfAnArrival() throws Exception {
        PurchaseArrivalVO created = createdArrival(
                arrivalRow(21L, 1, 11L, "5", "1000", "N", "행1 비고"), arrivalRow(23L, 2, 13L, "1", "500", "Y", null),
                arrivalRow(22L, 3, 12L, "2", "2000", "N", null));

        PurchaseReceiptVO result = service.createFromArrival(TENANT, USER, 5L, 7L, created);

        assertThat(result).isNotNull();
        verify(idSequenceService).nextValue("MATERIAL_RECEIPT_NO", "1", "20261116");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(receiptDAO).insertReceiptHeader(header.capture());
        assertThat(header.getValue()).containsEntry("receiptNo", "MI-20261116-0001")
                .containsEntry("receiptDt", LocalDate.of(2026, 11, 16)).containsEntry("supplierId", 20L)
                .containsEntry("receiverId", 5L).containsEntry("receiverDeptId", 7L)
                .containsEntry("currencyCode", "KRW").containsEntry("taxType", "TAXABLE")
                .containsEntry("vatIncludedAt", "N").containsEntry("createdBy", USER);
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("9000");
        assertThat((BigDecimal) header.getValue().get("vatAmt")).isEqualByComparingTo("900");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("9900");

        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(receiptDAO, times(2)).insertReceiptDetail(detail.capture());
        assertThat(detail.getAllValues().get(0)).containsEntry("purchaseReceiptId", RECEIPT_ID)
                .containsEntry("lineNo", 1).containsEntry("purchaseArrivalDetailId", 21L)
                .containsEntry("arrivalNo", "MP-20261116-0001").containsEntry("purchaseOrderDetailId", 11L)
                .containsEntry("warehouseId", 30L).containsEntry("remark", "행1 비고");
        assertThat((BigDecimal) detail.getAllValues().get(0).get("receiptQty")).isEqualByComparingTo("5");
        assertThat(detail.getAllValues().get(1)).containsEntry("lineNo", 2).containsEntry("purchaseArrivalDetailId", 22L);
    }

    @Test
    void createsNothingWhenEveryRowNeedsInspection() throws Exception {
        PurchaseArrivalVO created = createdArrival(arrivalRow(23L, 1, 13L, "1", "500", "Y", null));
        assertThat(service.createFromArrival(TENANT, USER, 5L, 7L, created)).isNull();
        verify(receiptDAO, never()).insertReceiptHeader(anyMap());
    }

    // ---- 수정 ----

    @Test
    void updateReflectsQuantityPriceAndWarehouseOnTheLinkedArrivalRowAndRecalculatesArrivalTotals() throws Exception {
        service.updateReceipt(TENANT, USER, RECEIPT_ID,
                payload(update(71L, "6", "1100"), update(72L, "2", "2000")));

        ArgumentCaptor<Map<String, Object>> arrivalRow = mapCaptor();
        verify(arrivalDAO, times(2)).updateArrivalDetail(arrivalRow.capture());
        Map<String, Object> first = arrivalRow.getAllValues().get(0);
        assertThat(first).containsEntry("purchaseArrivalDetailId", 21L).containsEntry("purchaseArrivalId", ARRIVAL_ID)
                .containsEntry("lineNo", 1).containsEntry("warehouseId", 30L).containsEntry("remark", "행1 비고")
                .containsEntry("updatedBy", USER);
        assertThat((BigDecimal) first.get("arrivalQty")).isEqualByComparingTo("6");
        assertThat((BigDecimal) first.get("unitPrice")).isEqualByComparingTo("1100");
        assertThat((BigDecimal) first.get("supplyAmt")).isEqualByComparingTo("6600");

        // 가입고 헤더 합계: 6,600 + 4,000 + 500(검사 대상 행은 그대로) = 11,100, 세액 1,110
        ArgumentCaptor<Map<String, Object>> arrivalHeader = mapCaptor();
        verify(arrivalDAO).updateArrivalHeader(arrivalHeader.capture());
        assertThat((BigDecimal) arrivalHeader.getValue().get("supplyAmt")).isEqualByComparingTo("11100");
        assertThat((BigDecimal) arrivalHeader.getValue().get("vatAmt")).isEqualByComparingTo("1110");
        assertThat((BigDecimal) arrivalHeader.getValue().get("totalAmt")).isEqualByComparingTo("12210");
        assertThat(arrivalHeader.getValue()).containsEntry("taxType", "TAXABLE").containsEntry("vatIncludedAt", "N");

        ArgumentCaptor<Map<String, Object>> receiptHeader = mapCaptor();
        verify(receiptDAO).updateReceiptHeader(receiptHeader.capture());
        assertThat((BigDecimal) receiptHeader.getValue().get("supplyAmt")).isEqualByComparingTo("10600");
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void updateAllowsQuantityOverTheOrderRemaining() throws Exception {
        service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(71L, "9999", "1000"), update(72L, "2", "2000")));
        verify(receiptDAO).updateReceiptHeader(anyMap());
    }

    @Test
    void removingALinkedReceiptRowDeletesTheArrivalRowAndRenumbersTheRest() throws Exception {
        service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(71L, "5", "1000")));

        ArgumentCaptor<Map<String, Object>> delete = mapCaptor();
        verify(arrivalDAO).deleteArrivalDetail(delete.capture());
        assertThat(delete.getValue()).containsEntry("purchaseArrivalDetailId", 22L)
                .containsEntry("purchaseArrivalId", ARRIVAL_ID);
        ArgumentCaptor<Map<String, Object>> renumber = mapCaptor();
        verify(arrivalDAO).updateArrivalDetailLineNo(renumber.capture());
        assertThat(renumber.getValue()).containsEntry("purchaseArrivalDetailId", 23L).containsEntry("lineNo", 2);
        ArgumentCaptor<Map<String, Object>> receiptDelete = mapCaptor();
        verify(receiptDAO).deleteReceiptDetail(receiptDelete.capture());
        assertThat(receiptDelete.getValue()).containsEntry("purchaseReceiptDetailId", 72L);
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
    }

    @Test
    void changingTheTaxSettingsRecalculatesTheUntouchedArrivalRowsAndSyncsTheArrivalHeader() throws Exception {
        PurchaseReceiptSaveRequestVO payload = payload(update(71L, "5", "1000"), update(72L, "2", "2000"));
        payload.setTaxType("EXEMPT");
        service.updateReceipt(TENANT, USER, RECEIPT_ID, payload);

        ArgumentCaptor<Map<String, Object>> rows = mapCaptor();
        verify(arrivalDAO, times(3)).updateArrivalDetail(rows.capture());
        Map<String, Object> untouched = rows.getAllValues().get(2);
        assertThat(untouched).containsEntry("purchaseArrivalDetailId", 23L);
        assertThat((BigDecimal) untouched.get("vatAmt")).isEqualByComparingTo("0");
        ArgumentCaptor<Map<String, Object>> arrivalHeader = mapCaptor();
        verify(arrivalDAO).updateArrivalHeader(arrivalHeader.capture());
        assertThat(arrivalHeader.getValue()).containsEntry("taxType", "EXEMPT").containsEntry("vatIncludedAt", "N");
        assertThat((BigDecimal) arrivalHeader.getValue().get("vatAmt")).isEqualByComparingTo("0");
    }

    @Test
    void updateDoesNotTouchTheArrivalWhenTheReceiptRowHasNoArrivalLink() throws Exception {
        PurchaseReceiptDetailVO orphan = receiptRow(71L, 1, null, "5", "1000", null);
        orphan.setPurchaseArrivalId(null);
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(orphan));
        service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(71L, "3", "1000")));
        verify(arrivalDAO, never()).updateArrivalDetail(anyMap());
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());
        verify(receiptDAO).updateReceiptDetail(anyMap());
    }

    @Test
    void updateRejectsInvalidInputCanceledMissingAndUnauthenticated() throws Exception {
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, payload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID,
                payload(update(71L, "0", "1000"), update(72L, "2", "2000"))), HttpStatus.BAD_REQUEST);
        PurchaseReceiptDetailSaveRequestVO noPrice = update(71L, "1", "1");
        noPrice.setUnitPrice(null);
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(noPrice, update(72L, "2", "2"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(99L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID,
                payload(update(71L, "1", "1"), update(71L, "2", "2"))), HttpStatus.BAD_REQUEST);
        verify(arrivalDAO, never()).updateArrivalDetail(anyMap());
        verify(receiptDAO, never()).updateReceiptHeader(anyMap());

        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(lockedReceipt("N"));
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(71L, "1", "1"))),
                HttpStatus.CONFLICT);
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, payload(update(71L, "1", "1"))),
                HttpStatus.NOT_FOUND);
        assertStatus(() -> service.updateReceipt(null, USER, RECEIPT_ID, payload(update(71L, "1", "1"))),
                HttpStatus.UNAUTHORIZED);
    }

    // ---- 취소 ----

    @Test
    void cancelDeactivatesTheReceiptAndRemovesTheLinkedArrivalRowsRenumberingTheRest() throws Exception {
        service.cancelReceipt(TENANT, USER, RECEIPT_ID);

        verify(arrivalDAO, times(2)).deleteArrivalDetail(anyMap());
        ArgumentCaptor<Map<String, Object>> renumber = mapCaptor();
        verify(arrivalDAO).updateArrivalDetailLineNo(renumber.capture());
        assertThat(renumber.getValue()).containsEntry("purchaseArrivalDetailId", 23L).containsEntry("lineNo", 1);
        ArgumentCaptor<Map<String, Object>> arrivalHeader = mapCaptor();
        verify(arrivalDAO).updateArrivalHeader(arrivalHeader.capture());
        assertThat((BigDecimal) arrivalHeader.getValue().get("supplyAmt")).isEqualByComparingTo("500");
        ArgumentCaptor<Map<String, Object>> cancel = mapCaptor();
        verify(receiptDAO).cancelReceiptHeader(cancel.capture());
        assertThat(cancel.getValue()).containsEntry("purchaseReceiptId", RECEIPT_ID).containsEntry("updatedBy", USER);
        verify(receiptDAO, never()).deleteReceiptDetail(anyMap());
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
    }

    @Test
    void cancelKeepsTheArrivalRowsAndCancelsOnlyTheArrivalHeaderWhenNothingWouldRemain() throws Exception {
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                arrivalRow(21L, 1, 11L, "5", "1000", "N", null), arrivalRow(22L, 2, 12L, "2", "2000", "N", null)));
        service.cancelReceipt(TENANT, USER, RECEIPT_ID);

        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
        ArgumentCaptor<Map<String, Object>> cancelArrival = mapCaptor();
        verify(arrivalDAO).cancelArrivalHeader(cancelArrival.capture());
        assertThat(cancelArrival.getValue()).containsEntry("purchaseArrivalId", ARRIVAL_ID)
                .containsEntry("updatedBy", USER);
        verify(receiptDAO).cancelReceiptHeader(anyMap());
    }

    @Test
    void cancelLeavesTheArrivalAloneForRowsThatAreNotNoInspectionLinks() throws Exception {
        PurchaseReceiptDetailVO inspected = receiptRow(71L, 1, 23L, "1", "500", "Y");
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(inspected));
        service.cancelReceipt(TENANT, USER, RECEIPT_ID);
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
        verify(receiptDAO).cancelReceiptHeader(anyMap());
    }

    @Test
    void cancelRejectsCanceledMissingUnauthenticatedAndConcurrentCancel() throws Exception {
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(lockedReceipt("N"));
        assertStatus(() -> service.cancelReceipt(TENANT, USER, RECEIPT_ID), HttpStatus.CONFLICT);
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.cancelReceipt(TENANT, USER, RECEIPT_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.cancelReceipt(null, USER, RECEIPT_ID), HttpStatus.UNAUTHORIZED);
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(lockedReceipt("Y"));
        when(receiptDAO.cancelReceiptHeader(anyMap())).thenReturn(0);
        assertStatus(() -> service.cancelReceipt(TENANT, USER, RECEIPT_ID), HttpStatus.CONFLICT);
    }

    // ---- 헬퍼 ----

    private PurchaseArrivalVO arrival() {
        PurchaseArrivalVO arrival = new PurchaseArrivalVO();
        arrival.setPurchaseArrivalId(ARRIVAL_ID);
        arrival.setArrivalNo("MP-20261116-0001");
        arrival.setArrivalDt(LocalDate.of(2026, 11, 16));
        arrival.setSupplierId(20L);
        arrival.setCurrencyCode("KRW");
        arrival.setTaxType("TAXABLE");
        arrival.setVatIncludedAt("N");
        arrival.setRemark("가입고 비고");
        arrival.setUseAt("Y");
        return arrival;
    }

    private PurchaseArrivalVO createdArrival(PurchaseArrivalDetailVO... rows) {
        PurchaseArrivalVO arrival = arrival();
        arrival.setDetails(new ArrayList<PurchaseArrivalDetailVO>(Arrays.asList(rows)));
        return arrival;
    }

    private PurchaseArrivalDetailVO arrivalRow(Long id, int lineNo, Long orderDetailId, String qty, String price,
            String inspectAt, String remark) {
        PurchaseArrivalDetailVO row = new PurchaseArrivalDetailVO();
        row.setPurchaseArrivalDetailId(id);
        row.setLineNo(lineNo);
        row.setPurchaseOrderDetailId(orderDetailId);
        row.setMaterialId(orderDetailId + 100);
        row.setArrivalQty(new BigDecimal(qty));
        row.setUnitPrice(new BigDecimal(price));
        BigDecimal supply = new BigDecimal(qty).multiply(new BigDecimal(price));
        row.setSupplyAmt(supply);
        row.setVatAmt(supply.multiply(new BigDecimal("0.1")));
        row.setTotalAmt(supply.multiply(new BigDecimal("1.1")));
        row.setWarehouseId(30L);
        row.setInspectAt(inspectAt);
        row.setRemark(remark);
        return row;
    }

    private PurchaseReceiptVO lockedReceipt(String useAt) {
        PurchaseReceiptVO receipt = new PurchaseReceiptVO();
        receipt.setPurchaseReceiptId(RECEIPT_ID);
        receipt.setReceiptNo("MI-20261116-0001");
        receipt.setSupplierId(20L);
        receipt.setCurrencyCode("KRW");
        receipt.setTaxType("TAXABLE");
        receipt.setVatIncludedAt("N");
        receipt.setUseAt(useAt);
        return receipt;
    }

    private PurchaseReceiptDetailVO receiptRow(Long id, int lineNo, Long arrivalDetailId, String qty, String price,
            String inspectAt) {
        PurchaseReceiptDetailVO row = new PurchaseReceiptDetailVO();
        row.setPurchaseReceiptDetailId(id);
        row.setLineNo(lineNo);
        row.setPurchaseArrivalDetailId(arrivalDetailId);
        row.setPurchaseArrivalId(arrivalDetailId == null ? null : ARRIVAL_ID);
        row.setArrivalActive(arrivalDetailId == null ? null : "Y");
        row.setInspectAt(inspectAt);
        row.setArrivalNo("MP-20261116-0001");
        row.setPurchaseOrderDetailId(arrivalDetailId == null ? 11L : arrivalDetailId - 10L);
        row.setMaterialId(111L);
        row.setReceiptQty(new BigDecimal(qty));
        row.setUnitPrice(new BigDecimal(price));
        row.setWarehouseId(30L);
        return row;
    }

    private PurchaseReceiptSaveRequestVO payload(PurchaseReceiptDetailSaveRequestVO... lines) {
        PurchaseReceiptSaveRequestVO payload = new PurchaseReceiptSaveRequestVO();
        payload.setReceiptDt(RECEIPT_DT);
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("N");
        payload.setDetails(new ArrayList<PurchaseReceiptDetailSaveRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseReceiptDetailSaveRequestVO update(Long receiptDetailId, String qty, String price) {
        PurchaseReceiptDetailSaveRequestVO line = new PurchaseReceiptDetailSaveRequestVO();
        line.setPurchaseReceiptDetailId(receiptDetailId);
        line.setReceiptQty(new BigDecimal(qty));
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
