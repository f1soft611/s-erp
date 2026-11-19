package egovframework.let.quality.inspect.create.service.impl;

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
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionArrivalRowVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionDetailSaveRequestVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionDetailVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionSaveRequestVO;
import egovframework.let.quality.inspect.create.domain.model.QualityInspectionVO;
import egovframework.let.quality.inspect.create.domain.repository.QualityInspectionDAO;

class QualityInspectionServiceImplTest {

    private static final Long TENANT = 1L;
    private static final String USER = "user01";
    private static final Long INSPECTION_ID = 900L;
    private static final LocalDate INSPECTION_DT = LocalDate.of(2026, 11, 17);

    @Mock
    private QualityInspectionDAO inspectionDAO;
    @Mock
    private PurchaseRequestDAO requestDAO;
    @Mock
    private IdSequenceService idSequenceService;

    private QualityInspectionServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new QualityInspectionServiceImpl(inspectionDAO, requestDAO, idSequenceService);
        when(requestDAO.selectRequester(anyMap())).thenReturn(requester(5L, 7L));
        when(inspectionDAO.selectInspector(anyMap())).thenReturn(requester(6L, 8L));
        when(idSequenceService.nextValue(anyString(), anyString(), anyString())).thenReturn(1L);
        when(inspectionDAO.insertInspectionHeader(anyMap())).thenReturn(INSPECTION_ID);
        when(inspectionDAO.insertInspectionDetail(anyMap())).thenReturn(901L);
        when(inspectionDAO.selectArrivalRows(anyMap())).thenReturn(Arrays.asList(
                arrivalRow(21L, "MP-20261117-0001", 11L, "10", "0"), arrivalRow(22L, "MP-20261117-0001", 12L, "4", "1")));
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(lockedInspection("Y"));
        when(inspectionDAO.selectInspection(anyMap())).thenReturn(new QualityInspectionVO());
        when(inspectionDAO.selectInspectionDetails(anyMap())).thenReturn(Arrays.asList(
                existing(71L, 1, 21L, "6", "1"), existing(72L, 2, 22L, "2", "0")));
        when(inspectionDAO.updateInspectionHeader(anyMap())).thenReturn(1);
        when(inspectionDAO.updateInspectionDetail(anyMap())).thenReturn(1);
        when(inspectionDAO.deleteInspectionDetail(anyMap())).thenReturn(1);
        when(inspectionDAO.cancelInspectionHeader(anyMap())).thenReturn(1);
    }

    // ---- 등록 ----

    @Test
    void createsOneInspectionNumberForSeveralArrivalRows() throws Exception {
        service.createInspection(TENANT, USER, create(
                create(21L, "7", "3"), create(22L, "3", "0")));

        verify(idSequenceService).nextValue("MATERIAL_INSPECTION_NO", "1", "20261117");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(inspectionDAO).insertInspectionHeader(header.capture());
        assertThat(header.getValue()).containsEntry("inspectionNo", "QI-20261117-0001")
                .containsEntry("inspectionDt", INSPECTION_DT).containsEntry("inspectorId", 5L)
                .containsEntry("inspectorDeptId", 7L).containsEntry("createdBy", USER).containsEntry("tenantId", TENANT);

        ArgumentCaptor<Map<String, Object>> detail = mapCaptor();
        verify(inspectionDAO, times(2)).insertInspectionDetail(detail.capture());
        Map<String, Object> first = detail.getAllValues().get(0);
        assertThat(first).containsEntry("qualityInspectionId", INSPECTION_ID).containsEntry("lineNo", 1)
                .containsEntry("purchaseArrivalDetailId", 21L).containsEntry("arrivalNo", "MP-20261117-0001")
                .containsEntry("purchaseOrderDetailId", 11L).containsEntry("materialId", 100L);
        assertThat((BigDecimal) first.get("passQty")).isEqualByComparingTo("7");
        assertThat((BigDecimal) first.get("failQty")).isEqualByComparingTo("3");
        assertThat(detail.getAllValues().get(1)).containsEntry("lineNo", 2).containsEntry("purchaseArrivalDetailId", 22L);
    }

    @Test
    void usesTheRequestedInspectorWhenGivenAndLooksItUpInTheTenant() throws Exception {
        QualityInspectionSaveRequestVO request = create(create(21L, "1", "0"));
        request.setInspectorId(6L);
        service.createInspection(TENANT, USER, request);
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(inspectionDAO).insertInspectionHeader(header.capture());
        assertThat(header.getValue()).containsEntry("inspectorId", 6L).containsEntry("inspectorDeptId", 8L);
    }

    @Test
    void locksTheArrivalRowsInIdOrderAndReadsThemAgainAfterTheLock() throws Exception {
        service.createInspection(TENANT, USER, create(create(22L, "1", "0"), create(21L, "1", "0")));
        ArgumentCaptor<Map<String, Object>> lookups = mapCaptor();
        verify(inspectionDAO, times(2)).selectArrivalRows(lookups.capture());
        assertThat(lookups.getAllValues().get(0)).containsEntry("forUpdate", Boolean.TRUE);
        assertThat(lookups.getAllValues().get(0).get("detailIds")).isEqualTo(Arrays.asList(21L, 22L));
        assertThat(lookups.getAllValues().get(1)).containsEntry("forUpdate", Boolean.FALSE);
    }

    @Test
    void rejectsAnInvalidCreateRequest() throws Exception {
        assertStatus(() -> service.createInspection(null, USER, create(create(21L, "1", "0"))), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createInspection(TENANT, " ", create(create(21L, "1", "0"))),
                HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.createInspection(TENANT, USER, null), HttpStatus.BAD_REQUEST);
        QualityInspectionSaveRequestVO noDate = create(create(21L, "1", "0"));
        noDate.setInspectionDt(null);
        assertStatus(() -> service.createInspection(TENANT, USER, noDate), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "0"), create(21L, "2", "0"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(null, "1", "0"))),
                HttpStatus.BAD_REQUEST);
        verify(inspectionDAO, never()).insertInspectionHeader(anyMap());
    }

    @Test
    void rejectsInvalidQuantities() throws Exception {
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "0", "0"))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "-1", "2"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "-1"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1.005", "0"))),
                HttpStatus.BAD_REQUEST);
        QualityInspectionDetailSaveRequestVO missing = create(21L, null, null);
        assertStatus(() -> service.createInspection(TENANT, USER, create(missing)), HttpStatus.BAD_REQUEST);
        verify(inspectionDAO, never()).insertInspectionHeader(anyMap());
    }

    @Test
    void rejectsAQuantityOverTheWaitingQuantityWithTheItemAndTheLimit() throws Exception {
        // 21번 행은 가입고 10, 기검사 0 → 대기 10. 합 11은 초과.
        assertThatThrownBy(() -> service.createInspection(TENANT, USER, create(create(21L, "8", "3"))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("품목21").contains("MP-20261117-0001").contains("10");
                });
        // 22번 행은 가입고 4, 기검사 1 → 대기 3. 합 3은 허용, 4는 초과.
        service.createInspection(TENANT, USER, create(create(22L, "2", "1")));
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(22L, "3", "1"))), HttpStatus.CONFLICT);
    }

    @Test
    void rejectsArrivalRowsThatAreNotInspectionTargetsOrCanceledOrMissing() throws Exception {
        QualityInspectionArrivalRowVO noInspection = arrivalRow(21L, "MP-1", 11L, "10", "0");
        noInspection.setInspectAt("N");
        when(inspectionDAO.selectArrivalRows(anyMap())).thenReturn(Arrays.asList(noInspection));
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "0"))), HttpStatus.CONFLICT);

        QualityInspectionArrivalRowVO canceled = arrivalRow(21L, "MP-1", 11L, "10", "0");
        canceled.setArrivalUseAt("N");
        when(inspectionDAO.selectArrivalRows(anyMap())).thenReturn(Arrays.asList(canceled));
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "0"))), HttpStatus.CONFLICT);

        when(inspectionDAO.selectArrivalRows(anyMap())).thenReturn(new ArrayList<QualityInspectionArrivalRowVO>());
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "0"))), HttpStatus.CONFLICT);
        verify(inspectionDAO, never()).insertInspectionHeader(anyMap());
    }

    @Test
    void rejectsAnUnknownInspector() throws Exception {
        when(inspectionDAO.selectInspector(anyMap())).thenReturn(null);
        QualityInspectionSaveRequestVO request = create(create(21L, "1", "0"));
        request.setInspectorId(99L);
        assertStatus(() -> service.createInspection(TENANT, USER, request), HttpStatus.BAD_REQUEST);
        when(requestDAO.selectRequester(anyMap())).thenReturn(null);
        assertStatus(() -> service.createInspection(TENANT, USER, create(create(21L, "1", "0"))), HttpStatus.FORBIDDEN);
    }

    // ---- 조회 ----

    @Test
    void getInspectionReturnsHeaderWithRowsOrNotFound() throws Exception {
        assertThat(service.getInspection(TENANT, INSPECTION_ID).getDetails()).hasSize(2);
        when(inspectionDAO.selectInspection(anyMap())).thenReturn(null);
        assertStatus(() -> service.getInspection(TENANT, INSPECTION_ID), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.getInspection(TENANT, null), HttpStatus.NOT_FOUND);
        assertStatus(() -> service.getInspection(null, INSPECTION_ID), HttpStatus.UNAUTHORIZED);
    }

    // ---- 수정 ----

    @Test
    void updateChangesQuantitiesAndRemarksAndExcludesTheInspectionItselfFromTheWaitingQuantity() throws Exception {
        QualityInspectionSaveRequestVO request = update(update(71L, "9", "1", "재검사"), update(72L, "1", "1", null));
        service.updateInspection(TENANT, USER, INSPECTION_ID, request);

        ArgumentCaptor<Map<String, Object>> lookups = mapCaptor();
        verify(inspectionDAO, times(2)).selectArrivalRows(lookups.capture());
        assertThat(lookups.getAllValues().get(0)).containsEntry("excludeInspectionId", INSPECTION_ID)
                .containsEntry("forUpdate", Boolean.TRUE);

        ArgumentCaptor<Map<String, Object>> rows = mapCaptor();
        verify(inspectionDAO, times(2)).updateInspectionDetail(rows.capture());
        assertThat(rows.getAllValues().get(0)).containsEntry("qualityInspectionDetailId", 71L)
                .containsEntry("lineNo", 1).containsEntry("remark", "재검사").containsEntry("updatedBy", USER);
        assertThat((BigDecimal) rows.getAllValues().get(0).get("passQty")).isEqualByComparingTo("9");
        ArgumentCaptor<Map<String, Object>> header = mapCaptor();
        verify(inspectionDAO).updateInspectionHeader(header.capture());
        assertThat(header.getValue()).containsEntry("inspectionDt", INSPECTION_DT).containsEntry("inspectorId", 5L)
                .containsEntry("inspectorDeptId", 7L).containsEntry("updatedBy", USER);
    }

    @Test
    void updateRejectsAQuantityOverTheWaitingQuantity() throws Exception {
        // 21번 행은 가입고 10, 다른 검사 0 → 최대 10
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(71L, "10", "1", null), update(72L, "1", "0", null))), HttpStatus.CONFLICT);
        verify(inspectionDAO, never()).updateInspectionDetail(anyMap());
    }

    @Test
    void updateRemovesRowsMissingFromTheRequestAndRenumbersTheRest() throws Exception {
        service.updateInspection(TENANT, USER, INSPECTION_ID, update(update(72L, "2", "0", null)));

        ArgumentCaptor<Map<String, Object>> deleted = mapCaptor();
        verify(inspectionDAO).deleteInspectionDetail(deleted.capture());
        assertThat(deleted.getValue()).containsEntry("qualityInspectionDetailId", 71L)
                .containsEntry("qualityInspectionId", INSPECTION_ID);
        ArgumentCaptor<Map<String, Object>> rows = mapCaptor();
        verify(inspectionDAO).updateInspectionDetail(rows.capture());
        assertThat(rows.getValue()).containsEntry("qualityInspectionDetailId", 72L).containsEntry("lineNo", 1);
    }

    @Test
    void updateRejectsRemovingEveryRowUnknownRowsAndDuplicates() throws Exception {
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, update()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, update(update(999L, "1", "0", null))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(71L, "1", "0", null), update(71L, "2", "0", null))), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, update(update(71L, "0", "0", null))),
                HttpStatus.BAD_REQUEST);
        QualityInspectionSaveRequestVO noDate = update(update(71L, "1", "0", null));
        noDate.setInspectionDt(null);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, noDate), HttpStatus.BAD_REQUEST);
        verify(inspectionDAO, never()).updateInspectionHeader(anyMap());
    }

    @Test
    void updateRejectsCanceledMissingAndConcurrentlyChangedInspections() throws Exception {
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(lockedInspection("N"));
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, update(update(71L, "1", "0", null))),
                HttpStatus.CONFLICT);
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID, update(update(71L, "1", "0", null))),
                HttpStatus.NOT_FOUND);

        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(lockedInspection("Y"));
        when(inspectionDAO.updateInspectionDetail(anyMap())).thenReturn(0);
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(71L, "1", "0", null), update(72L, "1", "0", null))), HttpStatus.CONFLICT);
    }

    // ---- 취소 ----

    @Test
    void cancelMarksTheHeaderCanceledAndKeepsTheRows() throws Exception {
        service.cancelInspection(TENANT, USER, INSPECTION_ID);
        ArgumentCaptor<Map<String, Object>> cancel = mapCaptor();
        verify(inspectionDAO).cancelInspectionHeader(cancel.capture());
        assertThat(cancel.getValue()).containsEntry("qualityInspectionId", INSPECTION_ID)
                .containsEntry("updatedBy", USER).containsEntry("tenantId", TENANT);
        verify(inspectionDAO, never()).deleteInspectionDetail(anyMap());
    }

    @Test
    void cancelRejectsAlreadyCanceledMissingAndRaceLostInspections() throws Exception {
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(lockedInspection("N"));
        assertStatus(() -> service.cancelInspection(TENANT, USER, INSPECTION_ID), HttpStatus.CONFLICT);
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(null);
        assertStatus(() -> service.cancelInspection(TENANT, USER, INSPECTION_ID), HttpStatus.NOT_FOUND);
        when(inspectionDAO.selectInspectionForUpdate(anyMap())).thenReturn(lockedInspection("Y"));
        when(inspectionDAO.cancelInspectionHeader(anyMap())).thenReturn(0);
        assertStatus(() -> service.cancelInspection(TENANT, USER, INSPECTION_ID), HttpStatus.CONFLICT);
    }

    // ---- 입고된 합격분 제한 ----

    @Test
    void cancelIsRejectedWhileTheInspectionHasAnActiveReceiptAndNamesIt() throws Exception {
        when(inspectionDAO.selectInspectionDetails(anyMap())).thenReturn(Arrays.asList(
                received(existing(71L, 1, 21L, "6", "1"), "3", "MI-20261117-0001"), existing(72L, 2, 22L, "2", "0")));
        assertThatThrownBy(() -> service.cancelInspection(TENANT, USER, INSPECTION_ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("입고 MI-20261117-0001").contains("취소");
                });
        verify(inspectionDAO, never()).cancelInspectionHeader(anyMap());
    }

    @Test
    void cancelIsAllowedWhenNoRowHasAnActiveReceipt() throws Exception {
        when(inspectionDAO.selectInspectionDetails(anyMap())).thenReturn(Arrays.asList(
                received(existing(71L, 1, 21L, "6", "1"), "0", null), existing(72L, 2, 22L, "2", "0")));
        service.cancelInspection(TENANT, USER, INSPECTION_ID);
        verify(inspectionDAO).cancelInspectionHeader(anyMap());
    }

    @Test
    void updateRejectsRemovingAReceivedRowOrLoweringItsPassedQuantityBelowTheReceivedQuantity() throws Exception {
        when(inspectionDAO.selectInspectionDetails(anyMap())).thenReturn(Arrays.asList(
                received(existing(71L, 1, 21L, "6", "1"), "4", "MI-20261117-0001"), existing(72L, 2, 22L, "2", "0")));
        // 입고된 행을 빼는 요청
        assertThatThrownBy(() -> service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(72L, "2", "0", null))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).contains("행 빼기").contains("입고 MI-20261117-0001");
                });
        // 합격량을 입고된 4보다 적게 줄이는 요청
        assertStatus(() -> service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(71L, "3", "1", null), update(72L, "2", "0", null))), HttpStatus.CONFLICT);
        verify(inspectionDAO, never()).updateInspectionHeader(anyMap());
        verify(inspectionDAO, never()).deleteInspectionDetail(anyMap());
    }

    @Test
    void updateStillAllowsFailedQuantityRemarkAndEqualOrLargerPassedQuantityOfAReceivedRow() throws Exception {
        when(inspectionDAO.selectInspectionDetails(anyMap())).thenReturn(Arrays.asList(
                received(existing(71L, 1, 21L, "6", "1"), "4", "MI-20261117-0001"), existing(72L, 2, 22L, "2", "0")));
        service.updateInspection(TENANT, USER, INSPECTION_ID,
                update(update(71L, "4", "4", "불량 증가"), update(72L, "2", "0", null)));
        verify(inspectionDAO).updateInspectionHeader(anyMap());
        verify(inspectionDAO, times(2)).updateInspectionDetail(anyMap());
    }

    // ---- 후보 ----

    @Test
    void candidatesNormalizeFiltersAndRejectAReversedDateRange() throws Exception {
        when(inspectionDAO.selectCandidates(anyMap())).thenReturn(new ArrayList<egovframework.let.quality.inspect.create.domain.model.QualityInspectionCandidateVO>());
        service.listCandidates(TENANT, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), " 한빛 ", null, "  ");
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(inspectionDAO).selectCandidates(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", TENANT).containsEntry("supplierKeyword", "한빛")
                .containsEntry("fromDt", LocalDate.of(2026, 11, 1)).containsEntry("toDt", LocalDate.of(2026, 11, 30));
        assertThat(params.getValue().get("materialKeyword")).isNull();
        assertThat(params.getValue().get("keyword")).isNull();
        assertStatus(() -> service.listCandidates(TENANT, LocalDate.of(2026, 12, 1), LocalDate.of(2026, 11, 1),
                null, null, null), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.listCandidates(null, null, null, null, null, null), HttpStatus.UNAUTHORIZED);
    }

    @Test
    void countWaitingReturnsZeroWhenThereIsNoRow() throws Exception {
        when(inspectionDAO.countWaitingCandidates(anyMap())).thenReturn(null);
        assertThat(service.countWaiting(TENANT)).isZero();
        when(inspectionDAO.countWaitingCandidates(anyMap())).thenReturn(4);
        assertThat(service.countWaiting(TENANT)).isEqualTo(4);
    }

    // ---- helpers ----

    private static PurchaseRequestRequesterVO requester(Long userId, Long departmentId) {
        PurchaseRequestRequesterVO requester = new PurchaseRequestRequesterVO();
        requester.setUserId(userId);
        requester.setDepartmentId(departmentId);
        return requester;
    }

    private static QualityInspectionVO lockedInspection(String useAt) {
        QualityInspectionVO locked = new QualityInspectionVO();
        locked.setQualityInspectionId(INSPECTION_ID);
        locked.setInspectionNo("QI-20261117-0001");
        locked.setInspectionDt(INSPECTION_DT);
        locked.setInspectorId(5L);
        locked.setUseAt(useAt);
        return locked;
    }

    private static QualityInspectionArrivalRowVO arrivalRow(Long id, String arrivalNo, Long orderDetailId,
            String arrivalQty, String inspectedQty) {
        QualityInspectionArrivalRowVO row = new QualityInspectionArrivalRowVO();
        row.setPurchaseArrivalDetailId(id);
        row.setPurchaseArrivalId(800L);
        row.setArrivalNo(arrivalNo);
        row.setArrivalUseAt("Y");
        row.setInspectAt("Y");
        row.setPurchaseOrderDetailId(orderDetailId);
        row.setMaterialId(100L);
        row.setMaterialCode("M" + id);
        row.setMaterialName("품목" + id);
        row.setArrivalQty(new BigDecimal(arrivalQty));
        row.setInspectedQty(new BigDecimal(inspectedQty));
        return row;
    }

    private static QualityInspectionDetailVO existing(Long id, int lineNo, Long arrivalDetailId, String pass,
            String fail) {
        QualityInspectionDetailVO detail = new QualityInspectionDetailVO();
        detail.setQualityInspectionDetailId(id);
        detail.setLineNo(lineNo);
        detail.setPurchaseArrivalDetailId(arrivalDetailId);
        detail.setPassQty(new BigDecimal(pass));
        detail.setFailQty(new BigDecimal(fail));
        return detail;
    }

    private static QualityInspectionDetailVO received(QualityInspectionDetailVO detail, String receivedQty,
            String receiptNo) {
        detail.setArrivalNo("MP-20261117-0001");
        detail.setReceivedQty(new BigDecimal(receivedQty));
        detail.setReceiptNo(receiptNo);
        return detail;
    }

    private static QualityInspectionDetailSaveRequestVO create(Long arrivalDetailId, String pass, String fail) {
        QualityInspectionDetailSaveRequestVO detail = new QualityInspectionDetailSaveRequestVO();
        detail.setPurchaseArrivalDetailId(arrivalDetailId);
        detail.setPassQty(pass == null ? null : new BigDecimal(pass));
        detail.setFailQty(fail == null ? null : new BigDecimal(fail));
        return detail;
    }

    private static QualityInspectionDetailSaveRequestVO update(Long detailId, String pass, String fail,
            String remark) {
        QualityInspectionDetailSaveRequestVO detail = new QualityInspectionDetailSaveRequestVO();
        detail.setQualityInspectionDetailId(detailId);
        detail.setPassQty(new BigDecimal(pass));
        detail.setFailQty(new BigDecimal(fail));
        detail.setRemark(remark);
        return detail;
    }

    private static QualityInspectionSaveRequestVO create(QualityInspectionDetailSaveRequestVO... details) {
        return request(details);
    }

    private static QualityInspectionSaveRequestVO update(QualityInspectionDetailSaveRequestVO... details) {
        return request(details);
    }

    private static QualityInspectionSaveRequestVO request(QualityInspectionDetailSaveRequestVO... details) {
        QualityInspectionSaveRequestVO request = new QualityInspectionSaveRequestVO();
        request.setInspectionDt(INSPECTION_DT);
        request.setDetails(new ArrayList<QualityInspectionDetailSaveRequestVO>(Arrays.asList(details)));
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
