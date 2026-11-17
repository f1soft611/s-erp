package egovframework.let.materials.receipt.closing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingReleaseRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSearchVO;
import egovframework.let.materials.receipt.closing.domain.repository.MaterialReceiptClosingDAO;
import egovframework.let.materials.receipt.closing.service.impl.MaterialReceiptClosingServiceImpl;

class MaterialReceiptClosingServiceTest {

    @Mock
    private MaterialReceiptClosingDAO dao;

    private MaterialReceiptClosingServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new MaterialReceiptClosingServiceImpl(dao);
        when(dao.selectSuppliers(anyMap())).thenReturn(new ArrayList<>());
        when(dao.selectRows(anyMap())).thenReturn(new ArrayList<>());
        when(dao.closeRow(anyMap())).thenReturn(1);
        when(dao.releaseRow(anyMap())).thenReturn(1);
    }

    // ---- 조회 ----

    @Test
    void listsSuppliersWithNormalizedConditions() throws Exception {
        MaterialReceiptClosingSearchVO search = search();
        search.setKeyword("  볼트 ");
        service.listSuppliers(1L, search);

        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).selectSuppliers(captor.capture());
        assertThat(captor.getValue()).containsEntry("tenantId", 1L).containsEntry("receiptFrom", "2026-11-01")
                .containsEntry("receiptTo", "2026-11-30").containsEntry("closingMonth", "202611")
                .containsEntry("keyword", "볼트");
    }

    @Test
    void requiresTenantReceiptRangeAndClosingMonthForTheSummary() {
        assertStatus(() -> service.listSuppliers(null, search()), HttpStatus.UNAUTHORIZED);

        MaterialReceiptClosingSearchVO noFrom = search();
        noFrom.setReceiptFrom(null);
        assertStatus(() -> service.listSuppliers(1L, noFrom), HttpStatus.BAD_REQUEST);

        MaterialReceiptClosingSearchVO reversed = search();
        reversed.setReceiptFrom("2026-12-01");
        assertStatus(() -> service.listSuppliers(1L, reversed), HttpStatus.BAD_REQUEST);

        MaterialReceiptClosingSearchVO badDate = search();
        badDate.setReceiptTo("2026-13-40");
        assertStatus(() -> service.listSuppliers(1L, badDate), HttpStatus.BAD_REQUEST);

        for (String month : new String[] { null, "", "2026-11", "202613", "202600", "20261", "abcdef" }) {
            MaterialReceiptClosingSearchVO badMonth = search();
            badMonth.setClosingMonth(month);
            assertStatus(() -> service.listSuppliers(1L, badMonth), HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void rowListDefaultsTheCloseTypeToAllAndRejectsUnknownValues() throws Exception {
        service.listRows(1L, search());
        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).selectRows(captor.capture());
        assertThat(captor.getValue().get("closeType")).isEqualTo("ALL");

        MaterialReceiptClosingSearchVO open = search();
        open.setCloseType("OPEN");
        open.setSupplierId(7L);
        open.setOrderNo(" PO-1 ");
        service.listRows(1L, open);
        verify(dao, times(2)).selectRows(captor.capture());
        assertThat(captor.getValue()).containsEntry("closeType", "OPEN").containsEntry("supplierId", 7L)
                .containsEntry("orderNo", "PO-1");

        MaterialReceiptClosingSearchVO unknown = search();
        unknown.setCloseType("DONE");
        assertStatus(() -> service.listRows(1L, unknown), HttpStatus.BAD_REQUEST);
    }

    @Test
    void closedTypeDoesNotRequireTheReceiptRange() throws Exception {
        MaterialReceiptClosingSearchVO closed = new MaterialReceiptClosingSearchVO();
        closed.setClosingMonth("202611");
        closed.setCloseType("CLOSED");
        service.listRows(1L, closed);
        verify(dao).selectRows(anyMap());

        MaterialReceiptClosingSearchVO open = new MaterialReceiptClosingSearchVO();
        open.setClosingMonth("202611");
        open.setCloseType("OPEN");
        assertStatus(() -> service.listRows(1L, open), HttpStatus.BAD_REQUEST);
    }

    // ---- 마감 ----

    @Test
    void closesRowsWithServerCalculatedAmountsAndLeavesTheReceiptValuesAlone() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Arrays.asList(
                lockedRow(11L, "10", null), lockedRow(12L, "3", null), lockedRow(13L, "5", null)));

        MaterialReceiptClosingRequestVO payload = closeRequest("202611",
                closeRow(11L, "1000", "TAXABLE", "N"),
                closeRow(12L, "1100", "TAXABLE", "Y"),
                closeRow(13L, "500", "EXEMPT", "N"));
        assertThat(service.close(1L, "admin", payload)).isEqualTo(3);

        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao, times(3)).closeRow(captor.capture());
        List<Map<String, Object>> calls = captor.getAllValues();

        // 과세·별도: 10 x 1000 = 10,000, 부가세 1,000, 합계 11,000
        assertThat(calls.get(0)).containsEntry("materialReceiptDetailId", 11L).containsEntry("closingMonth", "202611")
                .containsEntry("closedBy", "admin").containsEntry("tenantId", 1L).containsEntry("taxType", "TAXABLE")
                .containsEntry("vatIncludedAt", "N");
        assertThat((BigDecimal) calls.get(0).get("supplyAmt")).isEqualByComparingTo("10000.00");
        assertThat((BigDecimal) calls.get(0).get("vatAmt")).isEqualByComparingTo("1000.00");
        assertThat((BigDecimal) calls.get(0).get("totalAmt")).isEqualByComparingTo("11000.00");
        // 과세·포함: 3 x 1100 = 3,300 -> 공급가 3,000, 부가세 300
        assertThat((BigDecimal) calls.get(1).get("supplyAmt")).isEqualByComparingTo("3000.00");
        assertThat((BigDecimal) calls.get(1).get("vatAmt")).isEqualByComparingTo("300.00");
        assertThat((BigDecimal) calls.get(1).get("totalAmt")).isEqualByComparingTo("3300.00");
        // 면세: 5 x 500 = 2,500, 부가세 0
        assertThat((BigDecimal) calls.get(2).get("vatAmt")).isEqualByComparingTo("0");
        assertThat((BigDecimal) calls.get(2).get("totalAmt")).isEqualByComparingTo("2500.00");
    }

    @Test
    void lockedRowsAreRequestedInAscendingIdOrder() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Arrays.asList(
                lockedRow(5L, "1", null), lockedRow(9L, "1", null)));
        service.close(1L, "admin", closeRequest("202611",
                closeRow(9L, "10", "TAXABLE", "N"), closeRow(5L, "10", "TAXABLE", "N")));

        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao).selectRowsForUpdate(captor.capture());
        assertThat(captor.getValue().get("detailIds")).isEqualTo(Arrays.asList(5L, 9L));
    }

    @Test
    void rejectsInvalidCloseRequestsBeforeTouchingTheDatabase() throws Exception {
        assertStatus(() -> service.close(null, "admin", closeRequest("202611", closeRow(1L, "1", "TAXABLE", "N"))),
                HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.close(1L, " ", closeRequest("202611", closeRow(1L, "1", "TAXABLE", "N"))),
                HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.close(1L, "admin", null), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202613", closeRow(1L, "1", "TAXABLE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611")), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(null, "1", "TAXABLE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin",
                closeRequest("202611", closeRow(1L, "1", "TAXABLE", "N"), closeRow(1L, "2", "TAXABLE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "-1", "TAXABLE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, null, "TAXABLE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "1", "FREE", "N"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "1", "TAXABLE", "X"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "1", "EXEMPT", "Y"))),
                HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "1", "ZERO_RATED", "Y"))),
                HttpStatus.BAD_REQUEST);

        MaterialReceiptClosingRequestVO tooMany = closeRequest("202611");
        List<MaterialReceiptClosingRequestVO.Row> rows = new ArrayList<MaterialReceiptClosingRequestVO.Row>();
        for (long id = 1; id <= 501; id++) {
            rows.add(closeRow(id, "1", "TAXABLE", "N"));
        }
        tooMany.setRows(rows);
        assertStatus(() -> service.close(1L, "admin", tooMany), HttpStatus.BAD_REQUEST);

        verify(dao, never()).selectRowsForUpdate(anyMap());
        verify(dao, never()).closeRow(anyMap());
    }

    @Test
    void rejectsTheWholeCloseWhenARowIsAlreadyClosedCanceledOrMissing() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Arrays.asList(
                lockedRow(1L, "1", null), lockedRow(2L, "1", "202610")));
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611",
                closeRow(1L, "1", "TAXABLE", "N"), closeRow(2L, "1", "TAXABLE", "N"))), HttpStatus.CONFLICT);

        MaterialReceiptClosingRowVO canceled = lockedRow(3L, "1", null);
        canceled.setUseAt("N");
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Collections.singletonList(canceled));
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(3L, "1", "TAXABLE", "N"))),
                HttpStatus.CONFLICT);

        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Collections.singletonList(lockedRow(1L, "1", null)));
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611",
                closeRow(1L, "1", "TAXABLE", "N"), closeRow(99L, "1", "TAXABLE", "N"))), HttpStatus.CONFLICT);

        verify(dao, never()).closeRow(anyMap());
    }

    @Test
    void failsWithConflictWhenTheRowChangedBeforeTheUpdate() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Collections.singletonList(lockedRow(1L, "1", null)));
        when(dao.closeRow(anyMap())).thenReturn(0);
        assertStatus(() -> service.close(1L, "admin", closeRequest("202611", closeRow(1L, "1", "TAXABLE", "N"))),
                HttpStatus.CONFLICT);
    }

    // ---- 해제 ----

    @Test
    void releasesClosedRowsOnly() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Arrays.asList(
                lockedRow(4L, "1", "202611"), lockedRow(2L, "1", "202610")));
        assertThat(service.release(1L, "admin", releaseRequest(4L, 2L))).isEqualTo(2);

        ArgumentCaptor<Map<String, Object>> captor = mapCaptor();
        verify(dao, times(2)).releaseRow(captor.capture());
        assertThat(captor.getAllValues().get(0)).containsEntry("tenantId", 1L).containsEntry("updatedBy", "admin")
                .containsKey("materialReceiptDetailId");
    }

    @Test
    void rejectsReleaseOfOpenRowsMissingRowsAndInvalidRequests() throws Exception {
        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Arrays.asList(
                lockedRow(1L, "1", "202611"), lockedRow(2L, "1", null)));
        assertStatus(() -> service.release(1L, "admin", releaseRequest(1L, 2L)), HttpStatus.CONFLICT);

        when(dao.selectRowsForUpdate(anyMap())).thenReturn(Collections.singletonList(lockedRow(1L, "1", "202611")));
        assertStatus(() -> service.release(1L, "admin", releaseRequest(1L, 99L)), HttpStatus.CONFLICT);

        assertStatus(() -> service.release(null, "admin", releaseRequest(1L)), HttpStatus.UNAUTHORIZED);
        assertStatus(() -> service.release(1L, "admin", null), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.release(1L, "admin", releaseRequest()), HttpStatus.BAD_REQUEST);
        assertStatus(() -> service.release(1L, "admin", releaseRequest(1L, 1L)), HttpStatus.BAD_REQUEST);
        verify(dao, never()).releaseRow(anyMap());
    }

    // ---- 도우미 ----

    private static MaterialReceiptClosingSearchVO search() {
        MaterialReceiptClosingSearchVO search = new MaterialReceiptClosingSearchVO();
        search.setReceiptFrom("2026-11-01");
        search.setReceiptTo("2026-11-30");
        search.setClosingMonth("202611");
        return search;
    }

    private static MaterialReceiptClosingRowVO lockedRow(Long id, String qty, String closingMonth) {
        MaterialReceiptClosingRowVO row = new MaterialReceiptClosingRowVO();
        row.setMaterialReceiptDetailId(id);
        row.setReceiptNo("MI-" + id);
        row.setReceiptQty(new BigDecimal(qty));
        row.setUseAt("Y");
        row.setClosingMonth(closingMonth);
        return row;
    }

    private static MaterialReceiptClosingRequestVO closeRequest(String month,
            MaterialReceiptClosingRequestVO.Row... rows) {
        MaterialReceiptClosingRequestVO payload = new MaterialReceiptClosingRequestVO();
        payload.setClosingMonth(month);
        payload.setRows(new ArrayList<MaterialReceiptClosingRequestVO.Row>(Arrays.asList(rows)));
        return payload;
    }

    private static MaterialReceiptClosingRequestVO.Row closeRow(Long id, String unitPrice, String taxType,
            String vatIncludedAt) {
        MaterialReceiptClosingRequestVO.Row row = new MaterialReceiptClosingRequestVO.Row();
        row.setReceiptDetailId(id);
        row.setUnitPrice(unitPrice == null ? null : new BigDecimal(unitPrice));
        row.setTaxType(taxType);
        row.setVatIncludedAt(vatIncludedAt);
        return row;
    }

    private static MaterialReceiptClosingReleaseRequestVO releaseRequest(Long... ids) {
        MaterialReceiptClosingReleaseRequestVO payload = new MaterialReceiptClosingReleaseRequestVO();
        payload.setReceiptDetailIds(new ArrayList<Long>(Arrays.asList(ids)));
        return payload;
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) HashMap.class);
    }

    private static void assertStatus(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, HttpStatus status) {
        assertThatThrownBy(call).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatus()).isEqualTo(status));
    }
}
