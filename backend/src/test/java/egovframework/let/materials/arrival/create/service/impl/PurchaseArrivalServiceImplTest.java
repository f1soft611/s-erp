package egovframework.let.materials.arrival.create.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
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

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalDetailSaveRequestVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalDetailVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalOrderRowVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalSaveRequestVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalVO;
import egovframework.let.materials.arrival.create.domain.repository.PurchaseArrivalDAO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;
import egovframework.let.materials.receipt.create.service.PurchaseReceiptService;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

class PurchaseArrivalServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long ARRIVAL_ID = 800L;
    private static final LocalDate ARRIVAL_DT = LocalDate.of(2026, 11, 16);

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
    @Mock
    private PurchaseReceiptService receiptService;

    private PurchaseArrivalServiceImpl service;
    private final Map<Long, PurchaseArrivalOrderRowVO> orderRows = new HashMap<Long, PurchaseArrivalOrderRowVO>();

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new PurchaseArrivalServiceImpl(arrivalDAO, orderDAO, confirmDAO, requestDAO, idSequenceService,
                receiptService);
        orderRows.clear();
        orderRows.put(11L, orderRow(11L, "10", "3", "Y"));
        orderRows.put(12L, orderRow(12L, "4", "0", "N"));
        when(confirmDAO.existsSupplier(anyMap())).thenReturn(true);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(true);
        when(orderDAO.existsTaxType(anyMap())).thenReturn(true);
        PurchaseRequestRequesterVO requester = new PurchaseRequestRequesterVO();
        requester.setUserId(5L);
        requester.setDepartmentId(7L);
        when(requestDAO.selectRequester(anyMap())).thenReturn(requester);
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(1L);
        when(arrivalDAO.selectOrderRows(anyMap())).thenAnswer(invocation -> {
            Map<String, Object> params = invocation.getArgument(0);
            List<PurchaseArrivalOrderRowVO> rows = new ArrayList<PurchaseArrivalOrderRowVO>();
            for (Object id : (List<?>) params.get("detailIds")) {
                if (orderRows.containsKey(id)) {
                    rows.add(orderRows.get(id));
                }
            }
            return rows;
        });
        when(arrivalDAO.insertArrivalHeader(anyMap())).thenReturn(ARRIVAL_ID);
        when(arrivalDAO.insertArrivalDetail(anyMap())).thenReturn(801L);
        when(arrivalDAO.selectArrival(anyMap())).thenReturn(new PurchaseArrivalVO());
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                existing(21L, 1, 11L, "5", "1000"), existing(22L, 2, 12L, "2", "2000"),
                existing(23L, 3, 11L, "1", "500")));
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.updateArrivalHeader(anyMap())).thenReturn(1);
        when(arrivalDAO.updateArrivalDetail(anyMap())).thenReturn(1);
        when(arrivalDAO.deleteArrivalDetail(anyMap())).thenReturn(1);
        when(arrivalDAO.cancelArrivalHeader(anyMap())).thenReturn(1);
    }

    // ---- 등록 ----

    @Test
    void createsArrivalWithNumberReceiverAmountsAndInspectCopiedFromOrder() throws Exception {
        service.createArrival(TENANT, USER, payload(create(11L, "5", "1200")));

        verify(idSequenceService).nextValue("MATERIAL_PROVISIONAL_NO", "1", "20261116");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(arrivalDAO).insertArrivalHeader(header.capture());
        assertThat(header.getValue()).containsEntry("arrivalNo", "MP-20261116-0001")
                .containsEntry("supplierId", 20L).containsEntry("receiverId", 5L)
                .containsEntry("receiverDeptId", 7L).containsEntry("currencyCode", "KRW")
                .containsEntry("taxType", "TAXABLE").containsEntry("vatIncludedAt", "N")
                .containsEntry("createdBy", USER);
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("6000.00");
        assertThat((BigDecimal) header.getValue().get("vatAmt")).isEqualByComparingTo("600.00");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("6600.00");

        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(arrivalDAO).insertArrivalDetail(detail.capture());
        assertThat(detail.getValue()).containsEntry("purchaseArrivalId", ARRIVAL_ID)
                .containsEntry("lineNo", 1).containsEntry("purchaseOrderDetailId", 11L)
                .containsEntry("materialId", 111L).containsEntry("warehouseId", 30L)
                .containsEntry("inspectAt", "Y").containsEntry("createdBy", USER);
        assertThat((BigDecimal) detail.getValue().get("arrivalQty")).isEqualByComparingTo("5.00");
        assertThat((BigDecimal) detail.getValue().get("unitPrice")).isEqualByComparingTo("1200.00");
        assertThat((BigDecimal) detail.getValue().get("totalAmt")).isEqualByComparingTo("6600.00");
    }

    @Test
    void ignoresInspectAtFromTheRequestAndUsesTheOrderRowValue() throws Exception {
        PurchaseArrivalDetailSaveRequestVO line = create(12L, "1", "10");
        service.createArrival(TENANT, USER, payload(line));
        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(arrivalDAO).insertArrivalDetail(detail.capture());
        assertThat(detail.getValue()).containsEntry("inspectAt", "N");
    }

    @Test
    void allowsZeroUnitPriceButRequiresAValidOne() throws Exception {
        service.createArrival(TENANT, USER, payload(create(12L, "2", "0")));
        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(arrivalDAO).insertArrivalDetail(detail.capture());
        assertThat((BigDecimal) detail.getValue().get("supplyAmt")).isEqualByComparingTo("0");

        PurchaseArrivalDetailSaveRequestVO missing = create(12L, "2", "1");
        missing.setUnitPrice(null);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(missing)), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(12L, "2", "-1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(12L, "2", "1.005"))),
                HttpStatus.BAD_REQUEST);
        verify(arrivalDAO, times(1)).insertArrivalHeader(anyMap());
    }

    @Test
    void allowsQuantityOverTheOrderRemainingButStillRejectsZero() throws Exception {
        // 발주 10, 기가입고 3 → 잔량 7. 초과 여부는 화면 확인창이 맡고 서버는 허용한다.
        service.createArrival(TENANT, USER, payload(create(11L, "7.01", "1")));
        service.createArrival(TENANT, USER, payload(create(11L, "50", "1")));
        verify(arrivalDAO, times(2)).insertArrivalHeader(anyMap());
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(11L, "0", "1"))),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsDifferentSupplierCurrencyClosedCanceledMissingAndDuplicateOrderRows() throws Exception {
        PurchaseArrivalSaveRequestVO other = payload(create(11L, "1", "1"));
        other.setSupplierId(21L);
        assertStatus(() -> service.createArrival(TENANT, USER, other), HttpStatus.BAD_REQUEST);

        orderRows.get(12L).setCurrencyCode("USD");
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(11L, "1", "1"), create(12L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        orderRows.get(12L).setCurrencyCode("KRW");

        orderRows.get(12L).setReceiptCloseAt("Y");
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(12L, "1", "1"))), HttpStatus.CONFLICT);
        orderRows.get(12L).setReceiptCloseAt("N");

        orderRows.get(12L).setOrderUseAt("N");
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(12L, "1", "1"))), HttpStatus.CONFLICT);
        orderRows.get(12L).setOrderUseAt("Y");

        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(99L, "1", "1"))), HttpStatus.CONFLICT);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(11L, "1", "1"), create(11L, "2", "1"))),
                HttpStatus.BAD_REQUEST);
        verify(arrivalDAO, never()).insertArrivalHeader(anyMap());
    }

    @Test
    void validatesHeaderTaxWarehouseDatesAndAuthentication() throws Exception {
        PurchaseArrivalSaveRequestVO exempt = payload(create(11L, "1", "1"));
        exempt.setTaxType("EXEMPT");
        exempt.setVatIncludedAt("Y");
        assertStatus(() -> service.createArrival(TENANT, USER, exempt), HttpStatus.BAD_REQUEST);

        PurchaseArrivalDetailSaveRequestVO reversed = create(11L, "1", "1");
        reversed.setManufactureDt(LocalDate.of(2026, 11, 10));
        reversed.setExpireDt(LocalDate.of(2026, 11, 1));
        assertStatus(() -> service.createArrival(TENANT, USER, payload(reversed)), HttpStatus.BAD_REQUEST);

        PurchaseArrivalSaveRequestVO noDate = payload(create(11L, "1", "1"));
        noDate.setArrivalDt(null);
        assertStatus(() -> service.createArrival(TENANT, USER, noDate), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createArrival(TENANT, USER, payload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createArrival(null, USER, payload(create(11L, "1", "1"))), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createArrival(TENANT, " ", payload(create(11L, "1", "1"))),
                HttpStatus.UNAUTHORIZED);

        when(confirmDAO.existsSupplier(anyMap())).thenReturn(false);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(11L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        when(confirmDAO.existsSupplier(anyMap())).thenReturn(true);
        when(confirmDAO.existsWarehouse(anyMap())).thenReturn(false);
        assertStatus(() -> service.createArrival(TENANT, USER, payload(create(11L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        verify(arrivalDAO, never()).insertArrivalHeader(anyMap());
    }

    @Test
    void appliesTheOrderVatRulesIncludedAndOverride() throws Exception {
        PurchaseArrivalSaveRequestVO included = payload(create(11L, "1", "1100"));
        included.setVatIncludedAt("Y");
        service.createArrival(TENANT, USER, included);
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(arrivalDAO).insertArrivalHeader(header.capture());
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("1000.00");
        assertThat((BigDecimal) header.getValue().get("vatAmt")).isEqualByComparingTo("100.00");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("1100.00");

        PurchaseArrivalDetailSaveRequestVO override = create(11L, "2", "1000");
        override.setVatAmt(new BigDecimal("150"));
        service.createArrival(TENANT, USER, payload(override));
        ArgumentCaptor<Map<String, Object>> details = mapCaptor();
        verify(arrivalDAO, times(2)).insertArrivalDetail(details.capture());
        assertThat((BigDecimal) details.getAllValues().get(1).get("vatAmt")).isEqualByComparingTo("150.00");
        assertThat((BigDecimal) details.getAllValues().get(1).get("totalAmt")).isEqualByComparingTo("2150.00");
    }

    // ---- 조회 ----

    @Test
    void listCandidatesScopesToTenantAndRejectsReversedDates() throws Exception {
        service.listCandidates(TENANT, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), " 한일 ");
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(arrivalDAO).selectCandidates(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("keyword", "한일");
        assertStatus(() -> service.listCandidates(TENANT, LocalDate.of(2026, 12, 1), LocalDate.of(2026, 11, 1), null),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.listCandidates(null, null, null, null), HttpStatus.UNAUTHORIZED);
    }

    @Test
    void getArrivalReturnsHeaderWithDetailsOrNotFound() throws Exception {
        PurchaseArrivalVO result = service.getArrival(TENANT, ARRIVAL_ID);
        assertThat(result.getDetails()).hasSize(3);
        when(arrivalDAO.selectArrival(anyMap())).thenReturn(null);
        assertStatus(() -> service.getArrival(TENANT, ARRIVAL_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.getArrival(TENANT, null), HttpStatus.NOT_FOUND);
    }

    // ---- 수정 ----

    @Test
    void updateRecalculatesRenumbersAndDeletesRowsLeftOutOfTheRequest() throws Exception {
        // 기존 21(발주 11, 5), 22(발주 12, 2), 23(발주 11, 1). 22를 빼고 23, 21을 수정
        orderRows.put(11L, orderRow(11L, "10", "6", "Y")); // 이 가입고 5+1이 포함된 기가입고 합
        PurchaseArrivalSaveRequestVO request = payload(update(23L, "1", "500"), update(21L, "8", "1000"));
        request.setRemark(" 수정 ");
        service.updateArrival(TENANT, USER, ARRIVAL_ID, request);

        ArgumentCaptor<Map<String, Object>> deleted = mapCaptor();
        verify(arrivalDAO).deleteArrivalDetail(deleted.capture());
        assertThat(deleted.getValue()).containsEntry("purchaseArrivalDetailId", 22L);
        ArgumentCaptor<Map<String, Object>> updated = mapCaptor();
        verify(arrivalDAO, times(2)).updateArrivalDetail(updated.capture());
        assertThat(updated.getAllValues().get(0)).containsEntry("purchaseArrivalDetailId", 21L).containsEntry("lineNo", 1);
        assertThat(updated.getAllValues().get(1)).containsEntry("purchaseArrivalDetailId", 23L).containsEntry("lineNo", 2);
        assertThat((BigDecimal) updated.getAllValues().get(0).get("supplyAmt")).isEqualByComparingTo("8000.00");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(arrivalDAO).updateArrivalHeader(header.capture());
        assertThat(header.getValue()).containsEntry("remark", "수정").containsEntry("updatedBy", USER);
        assertThat((BigDecimal) header.getValue().get("supplyAmt")).isEqualByComparingTo("8500.00");
        assertThat((BigDecimal) header.getValue().get("totalAmt")).isEqualByComparingTo("9350.00");
        InOrder order = inOrder(arrivalDAO);
        order.verify(arrivalDAO).deleteArrivalDetail(anyMap());
        order.verify(arrivalDAO, times(2)).updateArrivalDetail(anyMap());
        order.verify(arrivalDAO).updateArrivalHeader(anyMap());
    }

    @Test
    void updateAllowsQuantityOverTheRemaining() throws Exception {
        // 발주 10, 유효 가입고 합 8(이 가입고 21의 5 + 다른 가입고 3) → 21의 권장 최대 수량은 7이지만 초과도 허용한다.
        orderRows.put(11L, orderRow(11L, "10", "8", "Y"));
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(existing(21L, 1, 11L, "5", "1000")));
        service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(21L, "7.01", "1")));
        verify(arrivalDAO).updateArrivalHeader(anyMap());
    }

    @Test
    void updateRejectsRemovingAllRowsUnknownDuplicateCanceledAndMissing() throws Exception {
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(99L, "1", "1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID,
                payload(update(21L, "1", "1"), update(21L, "2", "1"))), HttpStatus.BAD_REQUEST);
        PurchaseArrivalDetailSaveRequestVO noPrice = update(21L, "1", "1");
        noPrice.setUnitPrice(null);
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(noPrice)), HttpStatus.BAD_REQUEST);
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());

        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("N"));
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(21L, "1", "1"))),
                HttpStatus.CONFLICT);
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(21L, "1", "1"))),
                HttpStatus.NOT_FOUND);
    }

    // ---- 취소 ----

    @Test
    void cancelDeactivatesTheHeaderOnlyAndKeepsTheRows() throws Exception {
        service.cancelArrival(TENANT, USER, ARRIVAL_ID);
        ArgumentCaptor<Map<String, Object>> cancel = mapCaptor();
        verify(arrivalDAO).cancelArrivalHeader(cancel.capture());
        assertThat(cancel.getValue()).containsEntry("purchaseArrivalId", ARRIVAL_ID).containsEntry("updatedBy", USER);
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void cancelRejectsCanceledMissingUnauthenticatedAndConcurrentCancel() throws Exception {
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("N"));
        assertStatus(() -> service.cancelArrival(TENANT, USER, ARRIVAL_ID), HttpStatus.CONFLICT);
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.cancelArrival(TENANT, USER, ARRIVAL_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.cancelArrival(null, USER, ARRIVAL_ID), HttpStatus.UNAUTHORIZED);
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.cancelArrivalHeader(anyMap())).thenReturn(0);
        assertStatus(() -> service.cancelArrival(TENANT, USER, ARRIVAL_ID), HttpStatus.CONFLICT);
    }

    // ---- 무검사 자동 입고 연동 ----

    @Test
    void asksTheReceiptServiceToCreateTheNoInspectionReceiptAndReturnsItsNumber() throws Exception {
        PurchaseReceiptVO receipt = new PurchaseReceiptVO();
        receipt.setReceiptNo("MI-20261116-0001");
        receipt.setDetails(Arrays.asList(new PurchaseReceiptDetailVO(), new PurchaseReceiptDetailVO()));
        when(receiptService.createFromArrival(anyLong(), anyString(), anyLong(), anyLong(), any(PurchaseArrivalVO.class)))
                .thenReturn(receipt);

        PurchaseArrivalVO result = service.createArrival(TENANT, USER, payload(create(12L, "1", "10")));

        verify(receiptService).createFromArrival(org.mockito.ArgumentMatchers.eq(TENANT),
                org.mockito.ArgumentMatchers.eq(USER), org.mockito.ArgumentMatchers.eq(5L),
                org.mockito.ArgumentMatchers.eq(7L), any(PurchaseArrivalVO.class));
        assertThat(result.getAutoReceiptNo()).isEqualTo("MI-20261116-0001");
        assertThat(result.getAutoReceiptCount()).isEqualTo(2);
    }

    @Test
    void returnsNoAutoReceiptWhenNothingWasReceipted() throws Exception {
        PurchaseArrivalVO result = service.createArrival(TENANT, USER, payload(create(11L, "1", "10")));
        assertThat(result.getAutoReceiptNo()).isNull();
        assertThat(result.getAutoReceiptCount()).isNull();
    }

    // ---- 입고가 생긴 행 잠금 ----

    @Test
    void updateRejectsRemovingChangingOrRetargetingARowThatHasAReceipt() throws Exception {
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                receipted(existing(21L, 1, 11L, "5", "1000"), "MI-20261116-0001"), existing(22L, 2, 12L, "2", "2000")));

        // 입고가 있는 행을 빼는 요청
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(22L, "2", "2000"))),
                HttpStatus.CONFLICT);
        // 입고가 있는 행의 수량을 바꾸는 요청
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID,
                payload(update(21L, "6", "1000"), update(22L, "2", "2000"))), HttpStatus.CONFLICT);
        // 입고가 있는 가입고의 부가세구분을 바꾸는 요청
        PurchaseArrivalSaveRequestVO taxChange = payload(update(21L, "5", "1000"), update(22L, "2", "2000"));
        taxChange.setTaxType("EXEMPT");
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, taxChange), HttpStatus.CONFLICT);
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void updateStillEditsTheRowsWithoutAReceiptAndTheRemarkWhenSomeRowIsLocked() throws Exception {
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                receipted(existing(21L, 1, 11L, "5", "1000"), "MI-20261116-0001"), existing(22L, 2, 12L, "2", "2000")));
        PurchaseArrivalSaveRequestVO payload = payload(update(21L, "5", "1000"), update(22L, "3", "2000"));
        payload.setRemark("비고만 수정");

        service.updateArrival(TENANT, USER, ARRIVAL_ID, payload);

        verify(arrivalDAO).updateArrivalHeader(anyMap());
        verify(arrivalDAO, times(2)).updateArrivalDetail(anyMap());
    }

    @Test
    void cancelRejectsAnArrivalThatHasAReceiptAndNamesTheReceipt() throws Exception {
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                receipted(existing(21L, 1, 11L, "5", "1000"), "MI-20261116-0001"), existing(22L, 2, 12L, "2", "2000")));
        assertThatThrownBy(() -> service.cancelArrival(TENANT, USER, ARRIVAL_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("MI-20261116-0001");
                });
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
    }

    // ---- 수입검사가 등록된 행 잠금 ----

    @Test
    void updateRejectsRemovingChangingOrRetargetingARowThatHasAnInspectionAndNamesIt() throws Exception {
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                inspected(existing(21L, 1, 11L, "5", "1000"), "QI-20261117-0001"), existing(22L, 2, 12L, "2", "2000")));

        assertThatThrownBy(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, payload(update(22L, "2", "2000"))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("수입검사").contains("QI-20261117-0001");
                });
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID,
                payload(update(21L, "6", "1000"), update(22L, "2", "2000"))), HttpStatus.CONFLICT);
        PurchaseArrivalSaveRequestVO taxChange = payload(update(21L, "5", "1000"), update(22L, "2", "2000"));
        taxChange.setTaxType("EXEMPT");
        assertStatus(() -> service.updateArrival(TENANT, USER, ARRIVAL_ID, taxChange), HttpStatus.CONFLICT);
        verify(arrivalDAO, never()).updateArrivalHeader(anyMap());
        verify(arrivalDAO, never()).deleteArrivalDetail(anyMap());
    }

    @Test
    void updateStillEditsTheRowsWithoutAnInspectionAndTheRemarkWhenSomeRowIsInspected() throws Exception {
        when(arrivalDAO.selectArrivalForUpdate(anyMap())).thenReturn(lockedArrival("Y"));
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                inspected(existing(21L, 1, 11L, "5", "1000"), "QI-20261117-0001"), existing(22L, 2, 12L, "2", "2000")));
        PurchaseArrivalSaveRequestVO payload = payload(update(21L, "5", "1000"), update(22L, "3", "2000"));
        payload.setRemark("비고만 수정");

        service.updateArrival(TENANT, USER, ARRIVAL_ID, payload);

        verify(arrivalDAO).updateArrivalHeader(anyMap());
        verify(arrivalDAO, times(2)).updateArrivalDetail(anyMap());
    }

    @Test
    void cancelRejectsAnArrivalThatHasAnInspectionAndNamesIt() throws Exception {
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                inspected(existing(21L, 1, 11L, "5", "1000"), "QI-20261117-0001"), existing(22L, 2, 12L, "2", "2000")));
        assertThatThrownBy(() -> service.cancelArrival(TENANT, USER, ARRIVAL_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("수입검사").contains("QI-20261117-0001");
                });
        verify(arrivalDAO, never()).cancelArrivalHeader(anyMap());
    }

    @Test
    void cancelAndUpdateAreAllowedAgainOnceTheInspectionIsCanceledSoNoInspectionNoIsReturned() throws Exception {
        when(arrivalDAO.selectArrivalDetails(anyMap())).thenReturn(Arrays.asList(
                existing(21L, 1, 11L, "5", "1000"), existing(22L, 2, 12L, "2", "2000")));
        service.cancelArrival(TENANT, USER, ARRIVAL_ID);
        verify(arrivalDAO).cancelArrivalHeader(anyMap());
    }

    // ---- 헬퍼 ----

    private PurchaseArrivalDetailVO inspected(PurchaseArrivalDetailVO detail, String inspectionNo) {
        detail.setInspectionId(950L);
        detail.setInspectionNo(inspectionNo);
        // 저장된 행의 금액은 과세·미포함 계산값(수량 × 단가, 세액 10%)이다.
        BigDecimal supply = detail.getArrivalQty().multiply(detail.getUnitPrice());
        detail.setSupplyAmt(supply);
        detail.setVatAmt(supply.multiply(new BigDecimal("0.1")));
        detail.setTotalAmt(supply.multiply(new BigDecimal("1.1")));
        return detail;
    }

    private PurchaseArrivalDetailVO receipted(PurchaseArrivalDetailVO detail, String receiptNo) {
        detail.setReceiptId(900L);
        detail.setReceiptNo(receiptNo);
        // 저장된 행의 금액은 과세·미포함 계산값(수량 × 단가, 세액 10%)이다.
        BigDecimal supply = detail.getArrivalQty().multiply(detail.getUnitPrice());
        detail.setSupplyAmt(supply);
        detail.setVatAmt(supply.multiply(new BigDecimal("0.1")));
        detail.setTotalAmt(supply.multiply(new BigDecimal("1.1")));
        return detail;
    }

    private PurchaseArrivalOrderRowVO orderRow(Long id, String orderQty, String arrivedQty, String inspectAt) {
        PurchaseArrivalOrderRowVO row = new PurchaseArrivalOrderRowVO();
        row.setPurchaseOrderDetailId(id);
        row.setOrderUseAt("Y");
        row.setSupplierId(20L);
        row.setCurrencyCode("KRW");
        row.setMaterialId(id + 100);
        row.setOrderQty(new BigDecimal(orderQty));
        row.setArrivedQty(new BigDecimal(arrivedQty));
        row.setUnitPrice(new BigDecimal("1000"));
        row.setWarehouseId(30L);
        row.setInspectAt(inspectAt);
        row.setReceiptCloseAt("N");
        return row;
    }

    private PurchaseArrivalVO lockedArrival(String useAt) {
        PurchaseArrivalVO arrival = new PurchaseArrivalVO();
        arrival.setPurchaseArrivalId(ARRIVAL_ID);
        arrival.setArrivalDt(ARRIVAL_DT);
        arrival.setSupplierId(20L);
        arrival.setCurrencyCode("KRW");
        arrival.setTaxType("TAXABLE");
        arrival.setVatIncludedAt("N");
        arrival.setUseAt(useAt);
        return arrival;
    }

    private PurchaseArrivalDetailVO existing(Long id, int lineNo, Long orderDetailId, String qty, String price) {
        PurchaseArrivalDetailVO detail = new PurchaseArrivalDetailVO();
        detail.setPurchaseArrivalDetailId(id);
        detail.setLineNo(lineNo);
        detail.setPurchaseOrderDetailId(orderDetailId);
        detail.setMaterialId(orderDetailId + 100);
        detail.setArrivalQty(new BigDecimal(qty));
        detail.setUnitPrice(new BigDecimal(price));
        detail.setWarehouseId(30L);
        detail.setInspectAt("N");
        return detail;
    }

    private PurchaseArrivalSaveRequestVO payload(PurchaseArrivalDetailSaveRequestVO... lines) {
        PurchaseArrivalSaveRequestVO payload = new PurchaseArrivalSaveRequestVO();
        payload.setArrivalDt(ARRIVAL_DT);
        payload.setSupplierId(20L);
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("N");
        payload.setDetails(new ArrayList<PurchaseArrivalDetailSaveRequestVO>(Arrays.asList(lines)));
        return payload;
    }

    private PurchaseArrivalDetailSaveRequestVO create(Long orderDetailId, String qty, String price) {
        PurchaseArrivalDetailSaveRequestVO line = new PurchaseArrivalDetailSaveRequestVO();
        line.setPurchaseOrderDetailId(orderDetailId);
        line.setArrivalQty(new BigDecimal(qty));
        line.setUnitPrice(new BigDecimal(price));
        return line;
    }

    private PurchaseArrivalDetailSaveRequestVO update(Long arrivalDetailId, String qty, String price) {
        PurchaseArrivalDetailSaveRequestVO line = new PurchaseArrivalDetailSaveRequestVO();
        line.setPurchaseArrivalDetailId(arrivalDetailId);
        line.setArrivalQty(new BigDecimal(qty));
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
