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
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.arrival.create.domain.repository.PurchaseArrivalDAO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptCandidateVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptInspectionRowVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;
import egovframework.let.materials.receipt.create.domain.repository.PurchaseReceiptDAO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

/** 수입검사 합격분 입고 등록·후보 조회와 검사 연결 행 수정을 확인한다(무검사 입고는 PurchaseReceiptServiceImplTest). */
class PurchaseReceiptInspectionServiceTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long RECEIPT_ID = 900L;
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
        service = new PurchaseReceiptServiceImpl(receiptDAO, arrivalDAO, orderDAO, confirmDAO, requestDAO,
                idSequenceService);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(true);
        when(orderDAO.existsTaxType(anyMap())).thenReturn(true);
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(1L);
        when(requestDAO.selectRequester(anyMap())).thenReturn(requester(5L, 7L));
        when(receiptDAO.insertReceiptHeader(anyMap())).thenReturn(RECEIPT_ID);
        when(receiptDAO.insertReceiptDetail(anyMap())).thenReturn(901L);
        when(receiptDAO.selectReceipt(anyMap())).thenReturn(new PurchaseReceiptVO());
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(new ArrayList<PurchaseReceiptDetailVO>());
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(
                inspectionRow(31L, "QI-20261117-0001", 21L, "10", "4"),
                inspectionRow(32L, "QI-20261117-0001", 22L, "5", "0")));
        when(receiptDAO.selectReceiptForUpdate(anyMap())).thenReturn(lockedReceipt("Y"));
        when(receiptDAO.updateReceiptHeader(anyMap())).thenReturn(1);
        when(receiptDAO.updateReceiptDetail(anyMap())).thenReturn(1);
        when(receiptDAO.deleteReceiptDetail(anyMap())).thenReturn(1);
        when(receiptDAO.cancelReceiptHeader(anyMap())).thenReturn(1);
    }

    // ---- 후보 ----

    @Test
    void candidatesNormalizeFiltersAndRejectAReversedRange() throws Exception {
        when(receiptDAO.selectCandidates(anyMap())).thenReturn(new ArrayList<PurchaseReceiptCandidateVO>());
        service.listCandidates(TENANT, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), "  한빛 ");
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(receiptDAO).selectCandidates(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("keyword", "한빛")
                .containsEntry("fromDt", LocalDate.of(2026, 11, 1)).containsEntry("toDt", LocalDate.of(2026, 11, 30));
        assertStatus(() -> service.listCandidates(TENANT, LocalDate.of(2026, 12, 1), LocalDate.of(2026, 11, 1), null),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.listCandidates(null, null, null, null), HttpStatus.UNAUTHORIZED);
    }

    @Test
    void countCandidatesReturnsZeroWhenThereIsNoRow() throws Exception {
        when(receiptDAO.countCandidates(anyMap())).thenReturn(null);
        assertThat(service.countCandidates(TENANT)).isZero();
        when(receiptDAO.countCandidates(anyMap())).thenReturn(3);
        assertThat(service.countCandidates(TENANT)).isEqualTo(3);
    }

    // ---- 등록 ----

    @Test
    void createsOneReceiptFromSeveralInspectionRowsOfTheSameSupplier() throws Exception {
        service.createReceipt(TENANT, USER, create(create(32L, "5", "1000"), create(31L, "6", "2000")));

        verify(idSequenceService).nextValue("MATERIAL_RECEIPT_NO", "1", "20261117");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(receiptDAO).insertReceiptHeader(header.capture());
        assertThat(header.getValue()).containsEntry("receiptNo", "MI-20261117-0001")
                .containsEntry("receiptDt", RECEIPT_DT).containsEntry("supplierId", 20L)
                .containsEntry("receiverId", 5L).containsEntry("receiverDeptId", 7L)
                .containsEntry("currencyCode", "KRW").containsEntry("taxType", "TAXABLE")
                .containsEntry("vatIncludedAt", "N").containsEntry("createdBy", USER);
        // 5 × 1,000 + 6 × 2,000 = 17,000, 세액 10%
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("17000");
        assertThat((BigDecimal) header.getValue().get("vatAmt")).isEqualByComparingTo("1700");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("18700");

        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(receiptDAO, times(2)).insertReceiptDetail(detail.capture());
        Map<String, Object> first = detail.getAllValues().get(0);
        assertThat(first).containsEntry("purchaseReceiptId", RECEIPT_ID).containsEntry("lineNo", 1)
                .containsEntry("qualityInspectionDetailId", 32L).containsEntry("inspectionNo", "QI-20261117-0001")
                .containsEntry("purchaseArrivalDetailId", 22L).containsEntry("arrivalNo", "MP-20261117-0001")
                .containsEntry("purchaseOrderDetailId", 12L).containsEntry("warehouseId", 30L);
        assertThat(first.get("lotNo")).isNull();
        assertThat(detail.getAllValues().get(1)).containsEntry("lineNo", 2).containsEntry("qualityInspectionDetailId", 31L);
        // 가입고·발주 행은 건드리지 않는다.
        verify(arrivalDAO, never()).updateArrivalDetail(anyMap());
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());
    }

    @Test
    void locksTheInspectionRowsInIdOrderAndReadsThemAgainAfterTheLock() throws Exception {
        service.createReceipt(TENANT, USER, create(create(32L, "1", "1"), create(31L, "1", "1")));
        ArgumentCaptor<Map<String, Object>> lookups = mapCaptor();
        verify(receiptDAO, times(2)).selectInspectionRows(lookups.capture());
        assertThat(lookups.getAllValues().get(0)).containsEntry("forUpdate", Boolean.TRUE);
        assertThat(lookups.getAllValues().get(0).get("detailIds")).isEqualTo(Arrays.asList(31L, 32L));
        assertThat(lookups.getAllValues().get(1)).containsEntry("forUpdate", Boolean.FALSE);
    }

    @Test
    void rejectsAReceiptQuantityOverTheReceivableQuantityNamingTheLimit() throws Exception {
        // 31번 행: 합격 10, 기입고 4 → 가능 6
        assertThatThrownBy(() -> service.createReceipt(TENANT, USER, create(create(31L, "7", "1000"))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("품목31").contains("QI-20261117-0001").contains("6");
                });
        service.createReceipt(TENANT, USER, create(create(31L, "6", "1000")));
        verify(receiptDAO, times(1)).insertReceiptHeader(anyMap());
    }

    @Test
    void rejectsMixedSuppliersAndCurrencies() throws Exception {
        PurchaseReceiptInspectionRowVO other = inspectionRow(32L, "QI-20261117-0001", 22L, "5", "0");
        other.setSupplierId(99L);
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(
                inspectionRow(31L, "QI-20261117-0001", 21L, "10", "4"), other));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"), create(32L, "1", "1"))),
                HttpStatus.BAD_REQUEST);

        PurchaseReceiptInspectionRowVO usd = inspectionRow(32L, "QI-20261117-0001", 22L, "5", "0");
        usd.setCurrencyCode("USD");
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(
                inspectionRow(31L, "QI-20261117-0001", 21L, "10", "4"), usd));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"), create(32L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        verify(receiptDAO, never()).insertReceiptHeader(anyMap());
    }

    @Test
    void rejectsInspectionRowsThatAreCanceledOrLostTheirArrivalOrMissing() throws Exception {
        PurchaseReceiptInspectionRowVO canceled = inspectionRow(31L, "QI-1", 21L, "10", "0");
        canceled.setInspectionUseAt("N");
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(canceled));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"))), HttpStatus.CONFLICT);

        PurchaseReceiptInspectionRowVO noArrival = inspectionRow(31L, "QI-1", 21L, "10", "0");
        noArrival.setPurchaseArrivalDetailId(null);
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(noArrival));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"))), HttpStatus.CONFLICT);

        PurchaseReceiptInspectionRowVO arrivalCanceled = inspectionRow(31L, "QI-1", 21L, "10", "0");
        arrivalCanceled.setArrivalUseAt("N");
        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(Arrays.asList(arrivalCanceled));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"))), HttpStatus.CONFLICT);

        when(receiptDAO.selectInspectionRows(anyMap())).thenReturn(new ArrayList<PurchaseReceiptInspectionRowVO>());
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"))), HttpStatus.CONFLICT);
        verify(receiptDAO, never()).insertReceiptHeader(anyMap());
    }

    @Test
    void rejectsInvalidCreateRequests() throws Exception {
        assertStatus(() -> service.createReceipt(null, USER, create(create(31L, "1", "1"))), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createReceipt(TENANT, " ", create(create(31L, "1", "1"))), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createReceipt(TENANT, USER, null), HttpStatus.BAD_REQUEST);
        PurchaseReceiptSaveRequestVO noDate = create(create(31L, "1", "1"));
        noDate.setReceiptDt(null);
        assertStatus(() -> service.createReceipt(TENANT, USER, noDate), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"), create(31L, "2", "1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(null, "1", "1"))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "0", "1"))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1.005", "1"))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "-1"))), HttpStatus.BAD_REQUEST);
        PurchaseReceiptDetailSaveRequestVO noPrice = create(31L, "1", "1");
        noPrice.setUnitPrice(null);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(noPrice)), HttpStatus.BAD_REQUEST);
        PurchaseReceiptDetailSaveRequestVO noWarehouse = create(31L, "1", "1");
        noWarehouse.setWarehouseId(null);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(noWarehouse)), HttpStatus.BAD_REQUEST);
        PurchaseReceiptDetailSaveRequestVO badDates = create(31L, "1", "1");
        badDates.setManufactureDt(LocalDate.of(2026, 11, 10));
        badDates.setExpireDt(LocalDate.of(2026, 11, 1));
        assertStatus(() -> service.createReceipt(TENANT, USER, create(badDates)), HttpStatus.BAD_REQUEST);
        PurchaseReceiptSaveRequestVO exemptIncluded = create(create(31L, "1", "1"));
        exemptIncluded.setTaxType("EXEMPT");
        exemptIncluded.setVatIncludedAt("Y");
        assertStatus(() -> service.createReceipt(TENANT, USER, exemptIncluded), HttpStatus.BAD_REQUEST);
        verify(receiptDAO, never()).insertReceiptHeader(anyMap());

        when(requestDAO.selectRequester(anyMap())).thenReturn(null);
        assertStatus(() -> service.createReceipt(TENANT, USER, create(create(31L, "1", "1"))), HttpStatus.FORBIDDEN);
    }

    // ---- 수정·취소(검사 연결 행) ----

    @Test
    void updateLimitsAnInspectionRowToTheReceivableQuantityExcludingThisReceiptAndNeverTouchesTheArrival() throws Exception {
        // 이 입고가 가진 검사 행 31(합격 10, 이 입고를 뺀 기입고 4 → 상한 6)
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(receiptRow(71L, 1, 31L, "3")));
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, update(update(71L, "7", "1000"))),
                HttpStatus.CONFLICT);
        verify(receiptDAO, never()).updateReceiptHeader(anyMap());

        service.updateReceipt(TENANT, USER, RECEIPT_ID, update(update(71L, "6", "1000")));
        ArgumentCaptor<Map<String, Object>> lookups = mapCaptor();
        verify(receiptDAO, times(4)).selectInspectionRows(lookups.capture());
        assertThat(lookups.getAllValues().get(0)).containsEntry("excludeReceiptId", RECEIPT_ID)
                .containsEntry("forUpdate", Boolean.TRUE);
        verify(receiptDAO).updateReceiptDetail(anyMap());
        verify(receiptDAO).updateReceiptHeader(anyMap());
        verify(arrivalDAO, never()).updateArrivalDetail(anyMap());
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void removingAnInspectionRowOnlyDeletesTheReceiptRow() throws Exception {
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(
                receiptRow(71L, 1, 31L, "3"), receiptRow(72L, 2, 32L, "2")));
        service.updateReceipt(TENANT, USER, RECEIPT_ID, update(update(71L, "3", "1000")));
        ArgumentCaptor<Map<String, Object>> deleted = mapCaptor();
        verify(receiptDAO).deleteReceiptDetail(deleted.capture());
        assertThat(deleted.getValue()).containsEntry("purchaseReceiptDetailId", 72L);
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void cancelingAnInspectionReceiptOnlyCancelsTheReceiptHeader() throws Exception {
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(receiptRow(71L, 1, 31L, "3")));
        service.cancelReceipt(TENANT, USER, RECEIPT_ID);
        verify(receiptDAO).cancelReceiptHeader(anyMap());
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
        verify(arrivalDAO, never()).updateArrivalDetail(anyMap());
    }

    // ---- 매입마감 잠금 ----

    @Test
    void aReceiptWithAClosedRowCannotBeUpdatedOrCanceledAndTheMessageNamesTheClosingMonth() throws Exception {
        PurchaseReceiptDetailVO closed = receiptRow(72L, 2, 32L, "2");
        closed.setClosingMonth("202611");
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(receiptRow(71L, 1, 31L, "3"), closed));

        assertThatThrownBy(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID,
                update(update(71L, "3", "1000"), update(72L, "2", "1000"))))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(error.getReason()).contains("마감", "2026-11", "MI-20261117-0001");
                });
        // 행을 빼는 수정도 막힌다(마감 행이 요청에 없어도 입고에 마감 행이 있으면 거부).
        assertStatus(() -> service.updateReceipt(TENANT, USER, RECEIPT_ID, update(update(71L, "3", "1000"))),
                HttpStatus.CONFLICT);
        assertStatus(() -> service.cancelReceipt(TENANT, USER, RECEIPT_ID), HttpStatus.CONFLICT);

        verify(receiptDAO, never()).updateReceiptHeader(anyMap());
        verify(receiptDAO, never()).updateReceiptDetail(anyMap());
        verify(receiptDAO, never()).deleteReceiptDetail(anyMap());
        verify(receiptDAO, never()).cancelReceiptHeader(anyMap());
    }

    @Test
    void anOpenReceiptStillUpdatesAfterTheClosingCheck() throws Exception {
        when(receiptDAO.selectReceiptDetails(anyMap())).thenReturn(Arrays.asList(receiptRow(71L, 1, 31L, "3")));
        service.updateReceipt(TENANT, USER, RECEIPT_ID, update(update(71L, "3", "1000")));
        verify(receiptDAO).updateReceiptHeader(anyMap());
    }

    // ---- 헬퍼 ----

    private static PurchaseRequestRequesterVO requester(Long userId, Long departmentId) {
        PurchaseRequestRequesterVO requester = new PurchaseRequestRequesterVO();
        requester.setUserId(userId);
        requester.setDepartmentId(departmentId);
        return requester;
    }

    private static PurchaseReceiptVO lockedReceipt(String useAt) {
        PurchaseReceiptVO locked = new PurchaseReceiptVO();
        locked.setPurchaseReceiptId(RECEIPT_ID);
        locked.setReceiptNo("MI-20261117-0001");
        locked.setReceiptDt(RECEIPT_DT);
        locked.setSupplierId(20L);
        locked.setCurrencyCode("KRW");
        locked.setTaxType("TAXABLE");
        locked.setVatIncludedAt("N");
        locked.setUseAt(useAt);
        return locked;
    }

    private static PurchaseReceiptInspectionRowVO inspectionRow(Long id, String inspectionNo, Long arrivalDetailId,
            String passQty, String receivedQty) {
        PurchaseReceiptInspectionRowVO row = new PurchaseReceiptInspectionRowVO();
        row.setQualityInspectionDetailId(id);
        row.setQualityInspectionId(950L);
        row.setInspectionUseAt("Y");
        row.setInspectionNo(inspectionNo);
        row.setPurchaseArrivalDetailId(arrivalDetailId);
        row.setPurchaseArrivalId(800L);
        row.setArrivalUseAt("Y");
        row.setArrivalNo("MP-20261117-0001");
        row.setSupplierId(20L);
        row.setCurrencyCode("KRW");
        row.setPurchaseOrderDetailId(id - 20);
        row.setMaterialId(id + 100);
        row.setMaterialCode("M" + id);
        row.setMaterialName("품목" + id);
        row.setPassQty(new BigDecimal(passQty));
        row.setReceivedQty(new BigDecimal(receivedQty));
        return row;
    }

    private static PurchaseReceiptDetailVO receiptRow(Long id, int lineNo, Long inspectionDetailId, String qty) {
        PurchaseReceiptDetailVO row = new PurchaseReceiptDetailVO();
        row.setPurchaseReceiptDetailId(id);
        row.setLineNo(lineNo);
        row.setPurchaseArrivalDetailId(inspectionDetailId - 10);
        row.setPurchaseArrivalId(800L);
        row.setArrivalActive("Y");
        row.setInspectAt("Y");
        row.setArrivalNo("MP-20261117-0001");
        row.setQualityInspectionDetailId(inspectionDetailId);
        row.setInspectionNo("QI-20261117-0001");
        row.setPurchaseOrderDetailId(inspectionDetailId - 20);
        row.setMaterialId(inspectionDetailId + 100);
        row.setReceiptQty(new BigDecimal(qty));
        row.setUnitPrice(new BigDecimal("1000"));
        row.setWarehouseId(30L);
        return row;
    }

    private static PurchaseReceiptDetailSaveRequestVO create(Long inspectionDetailId, String qty, String price) {
        PurchaseReceiptDetailSaveRequestVO detail = new PurchaseReceiptDetailSaveRequestVO();
        detail.setQualityInspectionDetailId(inspectionDetailId);
        detail.setReceiptQty(new BigDecimal(qty));
        detail.setUnitPrice(new BigDecimal(price));
        detail.setWarehouseId(30L);
        return detail;
    }

    private static PurchaseReceiptDetailSaveRequestVO update(Long receiptDetailId, String qty, String price) {
        PurchaseReceiptDetailSaveRequestVO detail = new PurchaseReceiptDetailSaveRequestVO();
        detail.setPurchaseReceiptDetailId(receiptDetailId);
        detail.setReceiptQty(new BigDecimal(qty));
        detail.setUnitPrice(new BigDecimal(price));
        detail.setWarehouseId(30L);
        return detail;
    }

    private static PurchaseReceiptSaveRequestVO create(PurchaseReceiptDetailSaveRequestVO... details) {
        return request(details);
    }

    private static PurchaseReceiptSaveRequestVO update(PurchaseReceiptDetailSaveRequestVO... details) {
        return request(details);
    }

    private static PurchaseReceiptSaveRequestVO request(PurchaseReceiptDetailSaveRequestVO... details) {
        PurchaseReceiptSaveRequestVO request = new PurchaseReceiptSaveRequestVO();
        request.setReceiptDt(RECEIPT_DT);
        request.setDetails(new ArrayList<PurchaseReceiptDetailSaveRequestVO>(Arrays.asList(details)));
        return request;
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
    }

    private void assertStatus(ThrowingCall call, HttpStatus status) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(status));
    }

    private interface ThrowingCall {
        void run() throws Exception;
    }
}
