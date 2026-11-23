package egovframework.let.materials.request.confirm.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
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

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceLookupService;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseUnitPriceVO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;

class PurchaseRequestConfirmServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long CONFIRM_ID = 900L;

    @Mock
    private PurchaseRequestConfirmDAO dao;

    @Mock
    private IdSequenceService idSequenceService;

    @Mock
    private ItemPriceLookupService priceLookupService;

    private PurchaseRequestConfirmServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseRequestConfirmServiceImpl(dao, idSequenceService, priceLookupService);
        // 요청 5의 행 51·52(52는 이번에 고르지 않을 수 있음), 요청 6의 행 61
        when(dao.selectDetailLocksForUpdate(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, null), lock(61L, 6L, null)));
        when(dao.selectDetailLocks(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, null), lock(61L, 6L, null)));
        when(dao.selectDetailsByIds(anyMap())).thenReturn(Arrays.asList(stored(5L, 51L), stored(6L, 61L)));
        when(dao.selectDetailsByConfirm(anyMap())).thenReturn(Arrays.asList(stored(5L, 51L), stored(6L, 61L)));
        when(dao.selectConfirm(anyMap())).thenReturn(new PurchaseConfirmVO());
        when(dao.selectConfirmUseAtForUpdate(anyMap())).thenReturn("Y");
        when(dao.selectRequestIdsByConfirm(anyMap())).thenReturn(Arrays.asList(5L, 6L));
        when(dao.selectUserId(anyMap())).thenReturn(7L);
        when(dao.existsWarehouse(anyMap())).thenReturn(true);
        when(dao.existsOrderType(anyMap())).thenReturn(true);
        when(dao.existsTaxType(anyMap())).thenReturn(true);
        when(dao.existsSupplier(anyMap())).thenReturn(true);
        when(dao.insertConfirmHeader(anyMap())).thenReturn(CONFIRM_ID);
        when(dao.updateDetailConfirm(anyMap())).thenReturn(1);
        when(dao.cancelConfirmHeader(anyMap())).thenReturn(1);
        when(idSequenceService.nextValue("MATERIAL_CONFIRM_NO", "1", "20261112")).thenReturn(3L);
    }

    @Test
    void confirmsSelectedItemRowsAndRecalculatesRequestStatuses() throws Exception {
        service.createConfirm(TENANT, USER, payload(line(61L, "1", "10", "USD"), line(51L, "3", "1200.5", "USD")));

        ArgumentCaptor<Map<String, Object>> lockParams = mapCaptor();
        verify(dao).selectDetailLocksForUpdate(lockParams.capture());
        assertThat(lockParams.getValue().get("detailIds")).isEqualTo(Arrays.asList(51L, 61L));

        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(dao).insertConfirmHeader(header.capture());
        assertThat(header.getValue()).containsEntry("confirmNo", "MC-20261112-0003")
                .containsEntry("currencyCode", "USD").containsEntry("totalAmt", new BigDecimal("3611.50"));

        ArgumentCaptor<Map<String, Object>> details = mapCaptor();
        verify(dao, times(2)).updateDetailConfirm(details.capture());
        assertThat(details.getAllValues()).allSatisfy(values ->
                assertThat(values).containsEntry("purchaseConfirmId", CONFIRM_ID).containsEntry("updatedBy", USER));

        ArgumentCaptor<Map<String, Object>> refresh = mapCaptor();
        verify(dao).refreshRequestStatuses(refresh.capture());
        assertThat(refresh.getValue().get("purchaseRequestIds")).isEqualTo(Arrays.asList(5L, 6L));
    }

    @Test
    void rejectsCancelWhenActiveOrderUsesTheConfirm() throws Exception {
        when(dao.existsActiveOrderByConfirm(anyMap())).thenReturn(true);
        assertStatus(() -> service.cancelConfirm(TENANT, USER, CONFIRM_ID), HttpStatus.CONFLICT);
        verify(dao, never()).clearDetailsByConfirm(anyMap());
        verify(dao, never()).cancelConfirmHeader(anyMap());
    }

    @Test
    void rejectsItemsAlreadyConfirmedMissingOrChangedConcurrently() throws Exception {
        when(dao.selectDetailLocksForUpdate(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, 77L), lock(61L, 6L, null)));
        assertStatus(() -> service.createConfirm(TENANT, USER, validPayload()), HttpStatus.CONFLICT);
        when(dao.selectDetailLocksForUpdate(anyMap())).thenReturn(Collections.singletonList(lock(51L, 5L, null)));
        assertStatus(() -> service.createConfirm(TENANT, USER, validPayload()), HttpStatus.CONFLICT);
        verify(dao, never()).insertConfirmHeader(anyMap());

        when(dao.selectDetailLocksForUpdate(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, null), lock(61L, 6L, null)));
        when(dao.updateDetailConfirm(anyMap())).thenReturn(0);
        assertStatus(() -> service.createConfirm(TENANT, USER, validPayload()), HttpStatus.CONFLICT);
    }

    @Test
    void rejectsMixedCurrenciesBeforeIssuingNumber() throws Exception {
        assertStatus(() -> service.createConfirm(TENANT, USER, payload(line(51L, "1", "1", "KRW"), line(61L, "1", "1", "USD"))),
                HttpStatus.BAD_REQUEST);
        verify(dao, never()).insertConfirmHeader(anyMap());
        verify(idSequenceService, never()).nextValue("MATERIAL_CONFIRM_NO", "1", "20261112");
    }

    @Test
    void validatesItemSelectionAndRows() throws Exception {
        assertStatus(() -> service.createConfirm(TENANT, USER, payload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createConfirm(TENANT, USER, payload(line(51L, "1", null, null), line(51L, "1", null, null))),
                HttpStatus.BAD_REQUEST);
        List<PurchaseRequestConfirmDetailRequestVO> tooMany = new ArrayList<PurchaseRequestConfirmDetailRequestVO>();
        for (long id = 1; id <= 201; id++) tooMany.add(line(id, "1", null, null));
        assertStatus(() -> service.createConfirm(TENANT, USER,
                payload(tooMany.toArray(new PurchaseRequestConfirmDetailRequestVO[0]))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createConfirm(TENANT, USER, payload(line(51L, "0", null, null), line(61L, "1", null, null))),
                HttpStatus.BAD_REQUEST);
        PurchaseRequestConfirmRequestVO noDate = validPayload();
        noDate.setConfirmDt(null);
        assertStatus(() -> service.createConfirm(TENANT, USER, noDate), HttpStatus.BAD_REQUEST);
        when(dao.existsSupplier(anyMap())).thenReturn(false);
        assertStatus(() -> service.createConfirm(TENANT, USER, validPayload()), HttpStatus.BAD_REQUEST);
        verify(dao, never()).insertConfirmHeader(anyMap());
    }

    @Test
    void cancelClearsOnlyThatConfirmsRowsThenRecalculatesRequests() throws Exception {
        service.cancelConfirm(TENANT, USER, CONFIRM_ID);
        InOrder order = inOrder(dao);
        order.verify(dao).selectRequestIdsByConfirm(anyMap());
        order.verify(dao).clearDetailsByConfirm(anyMap());
        ArgumentCaptor<Map<String, Object>> refresh = mapCaptor();
        order.verify(dao).refreshRequestStatuses(refresh.capture());
        order.verify(dao).cancelConfirmHeader(anyMap());
        assertThat(refresh.getValue().get("purchaseRequestIds")).isEqualTo(Arrays.asList(5L, 6L));
    }

    @Test
    void cancelledConfirmCannotBeClosedOrCancelledAgain() throws Exception {
        when(dao.selectConfirmUseAtForUpdate(anyMap())).thenReturn("N");
        assertStatus(() -> service.saveOrderClose(TENANT, USER, CONFIRM_ID, close(51L, "Y")), HttpStatus.CONFLICT);
        assertStatus(() -> service.cancelConfirm(TENANT, USER, CONFIRM_ID), HttpStatus.CONFLICT);
        verify(dao, never()).clearDetailsByConfirm(anyMap());
    }

    @Test
    void orderCloseOnlyAcceptsRowsOfTheConfirm() throws Exception {
        assertStatus(() -> service.saveOrderClose(TENANT, USER, CONFIRM_ID, close(52L, "Y")), HttpStatus.BAD_REQUEST);
        service.saveOrderClose(TENANT, USER, CONFIRM_ID, close(61L, "Y"));
        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).updateDetailOrderClose(captor.capture());
        assertThat(captor.getValue()).containsEntry("purchaseRequestDetailId", 61L).containsEntry("orderCloseAt", "Y")
                .containsEntry("purchaseConfirmId", CONFIRM_ID);
    }

    @Test
    void loadRequestDetailsRejectsConfirmedItems() throws Exception {
        assertThat(service.loadRequestDetails(TENANT, Arrays.asList(61L, 51L), null)).hasSize(2);
        when(dao.selectDetailLocks(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, 9L), lock(61L, 6L, null)));
        assertStatus(() -> service.loadRequestDetails(TENANT, Arrays.asList(51L, 61L), null), HttpStatus.CONFLICT);
    }

    @Test
    void listConfirmsMapsStatusToUseAt() throws Exception {
        service.listConfirms(TENANT, null, null, null, null);
        service.listConfirms(TENANT, " MC ", "canceled", null, null);
        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao, times(2)).selectConfirms(captor.capture());
        assertThat(captor.getAllValues().get(0)).containsEntry("useAt", "Y");
        assertThat(captor.getAllValues().get(1)).containsEntry("useAt", "N").containsEntry("keyword", "MC");
        assertStatus(() -> service.listConfirms(TENANT, null, "DONE", null, null), HttpStatus.BAD_REQUEST);
    }

    @Test
    void candidateAndConfirmListsPassTheDateRangeToTheQuery() throws Exception {
        java.time.LocalDate from = java.time.LocalDate.of(2026, 10, 18);
        java.time.LocalDate to = java.time.LocalDate.of(2026, 11, 18);
        service.listCandidates(TENANT, "k", from, to);
        service.listConfirms(TENANT, null, null, from, to);
        ArgumentCaptor<Map<String, Object>> candidate = mapCaptor();
        verify(dao).selectCandidates(candidate.capture());
        assertThat(candidate.getValue()).containsEntry("fromDt", from).containsEntry("toDt", to);
        ArgumentCaptor<Map<String, Object>> list = mapCaptor();
        verify(dao).selectConfirms(list.capture());
        assertThat(list.getValue()).containsEntry("fromDt", from).containsEntry("toDt", to);
        assertStatus(() -> service.listCandidates(TENANT, null, to, from), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.listConfirms(TENANT, null, null, to, from), HttpStatus.BAD_REQUEST);
    }

    @Test
    void defaultUnitPriceComesFromTheSharedLookupServiceIncludingOrderType() throws Exception {
        ItemPriceLookupVO found = new ItemPriceLookupVO();
        found.setUnitPrice(new BigDecimal("1500"));
        found.setCurrency("KRW");
        found.setTaxType("TAXABLE");
        found.setVatIncludedAt("N");
        found.setForeignUnitPrice(new BigDecimal("1.5"));
        found.setForeignCurrency("USD");
        found.setOrderType("DOMESTIC");
        when(priceLookupService.findPrice(TENANT, "매입", 12L, 5L, LocalDate.of(2026, 11, 12))).thenReturn(found);

        PurchaseUnitPriceVO result = service.findDefaultUnitPrice(TENANT, 12L, 5L, LocalDate.of(2026, 11, 12));

        assertThat(result.getCurrency()).isEqualTo("KRW");
        assertThat(result.getUnitPrice()).isEqualByComparingTo("1500");
        assertThat(result.getTaxType()).isEqualTo("TAXABLE");
        assertThat(result.getVatIncludedAt()).isEqualTo("N");
        assertThat(result.getForeignCurrency()).isEqualTo("USD");
        assertThat(result.getForeignUnitPrice()).isEqualByComparingTo("1.5");
        assertThat(result.getOrderType()).isEqualTo("DOMESTIC");
    }

    @Test
    void defaultUnitPriceIsNullWhenNoPriceIsRegistered() throws Exception {
        when(priceLookupService.findPrice(eq(TENANT), eq("매입"), eq(12L), eq(5L), any(LocalDate.class))).thenReturn(null);
        assertThat(service.findDefaultUnitPrice(TENANT, 12L, 5L, LocalDate.of(2026, 11, 12))).isNull();
        assertStatus(() -> service.findDefaultUnitPrice(TENANT, 12L, null, LocalDate.of(2026, 11, 12)), HttpStatus.BAD_REQUEST);
    }

    @Test
    void loadRequestDetailsFillsDefaultSupplierPriceOnlyForUnconfirmedRows() throws Exception {
        PurchaseRequestConfirmDetailVO withDefault = stored(5L, 51L);
        withDefault.setMaterialId(100L);
        PurchaseRequestConfirmDetailVO withoutDefault = stored(6L, 61L);
        withoutDefault.setMaterialId(200L);
        PurchaseRequestConfirmDetailVO alreadyConfirmed = stored(6L, 62L);
        alreadyConfirmed.setMaterialId(300L);
        alreadyConfirmed.setConfirmQty(BigDecimal.ONE);
        when(dao.selectDetailsByIds(anyMap())).thenReturn(Arrays.asList(withDefault, withoutDefault, alreadyConfirmed));
        ItemPriceLookupVO found = new ItemPriceLookupVO();
        found.setMaterialId(100L);
        found.setSupplierId(7L);
        found.setSupplierCode("S7");
        found.setSupplierName("공급사7");
        found.setUnitPrice(new BigDecimal("1200"));
        found.setCurrency("KRW");
        found.setTaxType("TAXABLE");
        found.setVatIncludedAt("N");
        found.setOrderType("DOMESTIC");
        found.setOrderTypeName("내수");
        Map<Long, ItemPriceLookupVO> defaults = new HashMap<Long, ItemPriceLookupVO>();
        defaults.put(100L, found);
        LocalDate baseDt = LocalDate.of(2026, 11, 20);
        when(priceLookupService.findPurchasePrices(eq(TENANT), any(Collection.class), eq(baseDt)))
                .thenReturn(defaults);
        when(dao.selectDetailLocks(anyMap())).thenReturn(Arrays.asList(lock(51L, 5L, null), lock(61L, 6L, null),
                lock(62L, 6L, null)));

        List<PurchaseRequestConfirmDetailVO> result =
                service.loadRequestDetails(TENANT, Arrays.asList(51L, 61L, 62L), baseDt);

        assertThat(result.get(0).getSupplierId()).isEqualTo(7L);
        assertThat(result.get(0).getSupplierName()).isEqualTo("공급사7");
        assertThat(result.get(0).getUnitPrice()).isEqualByComparingTo("1200");
        assertThat(result.get(0).getOrderType()).isEqualTo("DOMESTIC");
        assertThat(result.get(0).getOrderTypeName()).isEqualTo("내수");
        assertThat(result.get(1).getSupplierId()).isNull();
        assertThat(result.get(1).getUnitPrice()).isNull();
        assertThat(result.get(2).getSupplierId()).isNull();
        ArgumentCaptor<Collection<Long>> materialIds = ArgumentCaptor.forClass((Class) Collection.class);
        verify(priceLookupService).findPurchasePrices(eq(TENANT), materialIds.capture(), eq(baseDt));
        assertThat(materialIds.getValue()).containsExactlyInAnyOrder(100L, 200L);
    }

    @Test
    void storesTaxTypeAndVatIncludedOnTheConfirmedRowWithTaxableDefaults() throws Exception {
        PurchaseRequestConfirmDetailRequestVO withTax = line(51L, "1", "100", "KRW");
        withTax.setTaxType("TAXABLE");
        withTax.setVatIncludedAt("Y");
        service.createConfirm(TENANT, USER, payload(withTax, line(61L, "1", "100", "KRW")));

        ArgumentCaptor<Map<String, Object>> details = mapCaptor();
        verify(dao, times(2)).updateDetailConfirm(details.capture());
        assertThat(details.getAllValues().get(0)).containsEntry("taxType", "TAXABLE").containsEntry("vatIncludedAt", "Y");
        assertThat(details.getAllValues().get(1)).containsEntry("taxType", "TAXABLE").containsEntry("vatIncludedAt", "N");
    }

    @Test
    void rejectsVatIncludedForNonTaxableUnknownTaxTypeAndInvalidFlag() throws Exception {
        PurchaseRequestConfirmDetailRequestVO nonTaxable = line(51L, "1", "100", "KRW");
        nonTaxable.setTaxType("EXEMPT");
        nonTaxable.setVatIncludedAt("Y");
        assertStatus(() -> service.createConfirm(TENANT, USER, payload(nonTaxable, line(61L, "1", "1", "KRW"))),
                HttpStatus.BAD_REQUEST);

        PurchaseRequestConfirmDetailRequestVO badFlag = line(51L, "1", "100", "KRW");
        badFlag.setVatIncludedAt("X");
        assertStatus(() -> service.createConfirm(TENANT, USER, payload(badFlag, line(61L, "1", "1", "KRW"))),
                HttpStatus.BAD_REQUEST);

        when(dao.existsTaxType(anyMap())).thenReturn(false);
        assertStatus(() -> service.createConfirm(TENANT, USER, validPayload()), HttpStatus.BAD_REQUEST);
        verify(dao, never()).insertConfirmHeader(anyMap());
    }

    private PurchaseRequestConfirmRequestVO validPayload() {
        return payload(line(51L, "1", null, null), line(61L, "1", null, null));
    }

    private PurchaseRequestConfirmRequestVO payload(PurchaseRequestConfirmDetailRequestVO... lines) {
        PurchaseRequestConfirmRequestVO payload = new PurchaseRequestConfirmRequestVO();
        payload.setConfirmDt(LocalDate.of(2026, 11, 12));
        payload.setDetails(new ArrayList<PurchaseRequestConfirmDetailRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseRequestConfirmDetailRequestVO line(Long id, String qty, String price, String currency) {
        PurchaseRequestConfirmDetailRequestVO line = new PurchaseRequestConfirmDetailRequestVO();
        line.setPurchaseRequestDetailId(id);
        line.setConfirmQty(new BigDecimal(qty));
        line.setConfirmDeliveryDt(LocalDate.of(2026, 11, 20));
        line.setWarehouseId(1L);
        line.setOrderType("RAW_MATERIAL");
        line.setSupplierId(4L);
        line.setUnitPrice(price == null ? null : new BigDecimal(price));
        line.setCurrencyCode(currency);
        return line;
    }

    private PurchaseRequestOrderCloseRequestVO close(Long id, String value) {
        PurchaseRequestOrderCloseDetailVO detail = new PurchaseRequestOrderCloseDetailVO();
        detail.setPurchaseRequestDetailId(id);
        detail.setOrderCloseAt(value);
        PurchaseRequestOrderCloseRequestVO payload = new PurchaseRequestOrderCloseRequestVO();
        payload.setDetails(new ArrayList<PurchaseRequestOrderCloseDetailVO>(Arrays.asList(detail)));
        return payload;
    }

    private PurchaseRequestDetailLockVO lock(Long detailId, Long requestId, Long confirmId) {
        PurchaseRequestDetailLockVO lock = new PurchaseRequestDetailLockVO();
        lock.setPurchaseRequestDetailId(detailId);
        lock.setPurchaseRequestId(requestId);
        lock.setPurchaseConfirmId(confirmId);
        return lock;
    }

    private PurchaseRequestConfirmDetailVO stored(Long requestId, Long detailId) {
        PurchaseRequestConfirmDetailVO detail = new PurchaseRequestConfirmDetailVO();
        detail.setPurchaseRequestId(requestId);
        detail.setPurchaseRequestDetailId(detailId);
        return detail;
    }

    private interface Action {
        void run() throws Exception;
    }

    private void assertStatus(Action action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatus()).isEqualTo(status));
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }
}
