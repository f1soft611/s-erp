package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportResolutionVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportValidationVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSearchCondition;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;

class ItemPartnerPriceServiceImplTest {
    private final ItemPartnerPriceDAO dao = mock(ItemPartnerPriceDAO.class);
    private final ItemPartnerPriceServiceImpl service = new ItemPartnerPriceServiceImpl(dao);

    @Test
    void listRequiresTenantAndNormalizesFilters() throws Exception {
        ItemPartnerPriceSearchCondition condition = new ItemPartnerPriceSearchCondition();
        condition.setKeyword("  flour  ");
        condition.setTradeType(" 매입 ");
        when(dao.selectItemPartnerPriceList(anyMap())).thenReturn(Collections.emptyList());

        service.listPrices(9L, condition);

        verify(dao).selectItemPartnerPriceList(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && "flour".equals(params.get("keyword"))
                        && "매입".equals(params.get("tradeType"))));
        assertThatThrownBy(() -> service.listPrices(0L, condition))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void listPassesCustomerIdOnlyWhenPositive() throws Exception {
        when(dao.selectItemPartnerPriceList(anyMap())).thenReturn(Collections.emptyList());
        ItemPartnerPriceSearchCondition withCustomer = new ItemPartnerPriceSearchCondition();
        withCustomer.setCustomerId(301L);
        service.listPrices(9L, withCustomer);
        verify(dao).selectItemPartnerPriceList(argThat(p -> Long.valueOf(301L).equals(p.get("customerId"))));

        service.listPrices(9L, new ItemPartnerPriceSearchCondition());
        verify(dao).selectItemPartnerPriceList(argThat(p -> !p.containsKey("customerId")));

        ItemPartnerPriceSearchCondition invalid = new ItemPartnerPriceSearchCondition();
        invalid.setCustomerId(0L);
        assertThatThrownBy(() -> service.listPrices(9L, invalid)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void importPreflightReturnsResolvedMasterIdsAndRejectsDuplicateBusinessKeys() throws Exception {
        ItemPartnerPriceImportRowVO first = row(2);
        ItemPartnerPriceImportRowVO second = row(3);
        ItemPartnerPriceImportResolutionVO resolvedFirst = resolved(2);
        ItemPartnerPriceImportResolutionVO resolvedSecond = resolved(3);
        when(dao.resolveImportRows(anyMap())).thenReturn(java.util.Arrays.asList(resolvedFirst, resolvedSecond));

        ItemPartnerPriceImportValidationVO result =
                service.validateImport(9L, java.util.Arrays.asList(first, second));

        assertThat(result.getRows()).hasSize(2);
        assertThat(result.getRows().get(0).getErrors()).isEmpty();
        assertThat(result.getRows().get(0).getMaterialId()).isEqualTo(101L);
        assertThat(result.getRows().get(1).getErrors()).anySatisfy(error -> {
            assertThat(error.getCode()).isEqualTo("DUPLICATE_FILE_KEY");
            assertThat(error.getMessage()).contains("3");
        });
        verify(dao).resolveImportRows(argThat(params ->
                Long.valueOf(9L).equals(params.get("tenantId"))
                        && ((java.util.List<?>) params.get("rows")).size() == 2));
    }

    @Test
    void preflightReportsMissingMastersAndInvalidPriceWithoutLosingSourceRow() throws Exception {
        ItemPartnerPriceImportRowVO row = row(7);
        row.setUnitPrice("-1");
        ItemPartnerPriceImportResolutionVO resolved = resolved(7);
        resolved.setMaterialId(null);
        when(dao.resolveImportRows(anyMap())).thenReturn(Collections.singletonList(resolved));

        ItemPartnerPriceImportValidationVO result =
                service.validateImport(9L, Collections.singletonList(row));

        assertThat(result.getRows()).singleElement().satisfies(validation -> {
            assertThat(validation.getSourceRowNumber()).isEqualTo(7);
            assertThat(validation.getErrors()).extracting("code")
                    .contains("ITEM_NOT_FOUND", "INVALID_UNIT_PRICE");
        });
    }

    @Test
    void invalidSpreadsheetDateIsNotCastByThePreflightQuery() throws Exception {
        ItemPartnerPriceImportRowVO row = row(8);
        row.setStartDt("2026-02-31");
        when(dao.resolveImportRows(anyMap())).thenReturn(Collections.singletonList(resolved(8)));

        ItemPartnerPriceImportValidationVO result =
                service.validateImport(9L, Collections.singletonList(row));

        assertThat(result.getRows().get(0).getErrors()).extracting("code")
                .contains("INVALID_START_DATE");
        verify(dao).resolveImportRows(argThat(params ->
                ((java.util.List<Map<String, Object>>) params.get("rows")).get(0).get("startDt") == null));
    }

    @Test
    void updateChecksOnlyChangedMasterAssociations() throws Exception {
        ItemPartnerPriceVO existing = new ItemPartnerPriceVO();
        existing.setPriceId(44L);
        existing.setMaterialId(101L);
        existing.setCustomerId(201L);
        existing.setTradeType("매입");
        existing.setStartDt(LocalDate.now().plusDays(5).toString());
        ItemPartnerPriceVO saved = new ItemPartnerPriceVO();
        saved.setPriceId(44L);
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(existing, saved);
        when(dao.selectActiveCustomer(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.selectPriceIdByBusinessKey(anyMap())).thenReturn(null);
        when(dao.selectOverlappingPriceId(anyMap())).thenReturn(null);
        when(dao.updateItemPartnerPrice(anyMap())).thenReturn(1);

        service.updatePrice(9L, "00101", 44L, validPayload(101L, 202L));

        verify(dao, never()).selectActiveMaterial(anyMap());
        verify(dao).selectActiveCustomer(anyMap());
        verify(dao).updateItemPartnerPrice(anyMap());
    }

    @Test
    void createWithoutCustomerSavesDefaultPriceAndSkipsCustomerLookup() throws Exception {
        stubCreate();

        service.createPrice(9L, "00101", validPayload(101L, null));

        verify(dao, never()).selectActiveCustomer(anyMap());
        verify(dao).insertItemPartnerPrice(argThat(params -> params.get("customerId") == null));
    }

    @Test
    void createAllowsForeignPriceOnlyAndRejectsWhenBothPricesAreMissing() throws Exception {
        ItemPartnerPriceSaveRequestVO foreignOnly = validPayload(101L, 201L);
        foreignOnly.setUnitPrice(null);
        foreignOnly.setForeignUnitPrice(new BigDecimal("7.25"));
        foreignOnly.setCurrency("USD");
        stubCreate();

        service.createPrice(9L, "00101", foreignOnly);

        verify(dao).insertItemPartnerPrice(argThat(params ->
                params.get("unitPrice") == null
                        && new BigDecimal("7.25").equals(params.get("foreignUnitPrice"))
                        && "USD".equals(params.get("currency"))));

        ItemPartnerPriceSaveRequestVO none = validPayload(101L, 201L);
        none.setUnitPrice(null);
        assertThatThrownBy(() -> service.createPrice(9L, "00101", none))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("원화단가 또는 외화단가");
    }

    @Test
    void createRejectsVatIncludedForNonTaxableType() throws Exception {
        ItemPartnerPriceSaveRequestVO payload = validPayload(101L, 201L);
        payload.setTaxType("EXEMPT");
        payload.setVatIncludedAt("Y");

        assertThatThrownBy(() -> service.createPrice(9L, "00101", payload))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("과세");
        verify(dao, never()).insertItemPartnerPrice(anyMap());
    }

    @Test
    void importAcceptsForeignPriceOnlyRowAndFlagsRowWithoutAnyPriceOrVatOnNonTaxable() throws Exception {
        ItemPartnerPriceImportRowVO foreignOnly = row(2);
        foreignOnly.setUnitPrice("");
        foreignOnly.setForeignUnitPrice("3.5");
        foreignOnly.setCurrency("USD");
        ItemPartnerPriceImportRowVO none = row(3);
        none.setUnitPrice("");
        ItemPartnerPriceImportRowVO vat = row(4);
        vat.setTaxType("EXEMPT");
        vat.setVatIncludedAt("Y");
        when(dao.resolveImportRows(anyMap())).thenReturn(java.util.Arrays.asList(resolved(2), resolved(3), resolved(4)));
        when(dao.existsCommonCode(anyMap())).thenReturn(true);

        ItemPartnerPriceImportValidationVO result =
                service.validateImport(9L, java.util.Arrays.asList(foreignOnly, none, vat));

        assertThat(result.getRows().get(0).getErrors()).isEmpty();
        assertThat(result.getRows().get(1).getErrors()).extracting("code").contains("INVALID_UNIT_PRICE");
        assertThat(result.getRows().get(2).getErrors()).extracting("code").contains("INVALID_VAT_INCLUDED_AT");
    }

    @Test
    void createStoresVatAndForeignPriceFields() throws Exception {
        ItemPartnerPriceSaveRequestVO payload = validPayload(101L, 201L);
        payload.setTaxType("TAXABLE");
        payload.setVatIncludedAt("Y");
        payload.setForeignUnitPrice(new BigDecimal("9.50"));
        payload.setCurrency("USD");
        stubCreate();

        service.createPrice(9L, "00101", payload);

        verify(dao).insertItemPartnerPrice(argThat(params ->
                "TAXABLE".equals(params.get("taxType"))
                        && "Y".equals(params.get("vatIncludedAt"))
                        && new BigDecimal("9.50").equals(params.get("foreignUnitPrice"))
                        && "USD".equals(params.get("currency"))));
    }

    @Test
    void createDefaultsVatFieldsAndDropsCurrencyWithoutForeignPrice() throws Exception {
        ItemPartnerPriceSaveRequestVO payload = validPayload(101L, 201L);
        payload.setCurrency("USD");
        stubCreate();

        service.createPrice(9L, "00101", payload);

        verify(dao).insertItemPartnerPrice(argThat(params ->
                "TAXABLE".equals(params.get("taxType"))
                        && "N".equals(params.get("vatIncludedAt"))
                        && params.get("foreignUnitPrice") == null
                        && params.get("currency") == null));
    }

    @Test
    void createRejectsForeignPriceWithoutCurrencyAndUnknownTaxType() throws Exception {
        ItemPartnerPriceSaveRequestVO noCurrency = validPayload(101L, 201L);
        noCurrency.setCurrency(null);
        noCurrency.setForeignUnitPrice(new BigDecimal("1.00"));
        assertThatThrownBy(() -> service.createPrice(9L, "00101", noCurrency))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("통화");

        ItemPartnerPriceSaveRequestVO badTax = validPayload(101L, 201L);
        badTax.setTaxType("NOPE");
        when(dao.selectActiveMaterial(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.selectActiveCustomer(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.existsCommonCode(anyMap())).thenReturn(false);
        assertThatThrownBy(() -> service.createPrice(9L, "00101", badTax))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("부가세구분");
        verify(dao, never()).insertItemPartnerPrice(anyMap());
    }

    @Test
    void createRejectsOverlappingPeriodAndClosesNothing() throws Exception {
        stubCreate();
        when(dao.selectOverlappingPriceId(anyMap())).thenReturn(7L);

        assertThatThrownBy(() -> service.createPrice(9L, "00101", validPayload(101L, 201L)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("겹");
        verify(dao, never()).closePreviousOpenPrices(anyMap());
        verify(dao, never()).insertItemPartnerPrice(anyMap());
    }

    @Test
    void createClosesPreviousOpenEndedPriceBeforeInserting() throws Exception {
        stubCreate();

        service.createPrice(9L, "00101", validPayload(101L, 201L));

        org.mockito.InOrder order = inOrder(dao);
        order.verify(dao).closePreviousOpenPrices(argThat(params ->
                "2026-10-01".equals(params.get("startDt"))));
        order.verify(dao).insertItemPartnerPrice(anyMap());
    }

    @Test
    void updateRejectsPastRow() throws Exception {
        ItemPartnerPriceVO existing = existingRow(LocalDate.now().minusDays(30), LocalDate.now().minusDays(1));
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(existing);
        ItemPartnerPriceSaveRequestVO payload = validPayload(101L, 201L);
        payload.setStartDt(existing.getStartDt());

        assertThatThrownBy(() -> service.updatePrice(9L, "00101", 44L, payload))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("과거");
        verify(dao, never()).updateItemPartnerPrice(anyMap());
    }

    @Test
    void updateRejectsChangingStartDateOfCurrentRow() throws Exception {
        ItemPartnerPriceVO existing = existingRow(LocalDate.now().minusDays(10), null);
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(existing);
        ItemPartnerPriceSaveRequestVO payload = validPayload(101L, 201L);
        payload.setStartDt(LocalDate.now().minusDays(5).toString());

        assertThatThrownBy(() -> service.updatePrice(9L, "00101", 44L, payload))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("적용");
        verify(dao, never()).updateItemPartnerPrice(anyMap());
    }

    @Test
    void updateAllowsCorrectingCurrentRowAndMovingFutureRow() throws Exception {
        ItemPartnerPriceVO current = existingRow(LocalDate.now().minusDays(10), null);
        ItemPartnerPriceVO future = existingRow(LocalDate.now().plusDays(10), null);
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(current, current, future, future);
        when(dao.existsCommonCode(anyMap())).thenReturn(true);
        when(dao.selectPriceIdByBusinessKey(anyMap())).thenReturn(null);
        when(dao.selectOverlappingPriceId(anyMap())).thenReturn(null);
        when(dao.updateItemPartnerPrice(anyMap())).thenReturn(1);
        ItemPartnerPriceSaveRequestVO correction = validPayload(101L, 201L);
        correction.setStartDt(current.getStartDt());
        correction.setUnitPrice(new BigDecimal("999.00"));
        service.updatePrice(9L, "00101", 44L, correction);

        ItemPartnerPriceSaveRequestVO moved = validPayload(101L, 201L);
        moved.setStartDt(LocalDate.now().plusDays(20).toString());
        service.updatePrice(9L, "00101", 44L, moved);

        verify(dao, times(2)).updateItemPartnerPrice(anyMap());
    }

    @Test
    void listHidesPastRowsUnlessHistoryIsRequested() throws Exception {
        when(dao.selectItemPartnerPriceList(anyMap())).thenReturn(Collections.emptyList());
        service.listPrices(9L, new ItemPartnerPriceSearchCondition());
        ItemPartnerPriceSearchCondition withHistory = new ItemPartnerPriceSearchCondition();
        withHistory.setIncludeHistory(true);
        service.listPrices(9L, withHistory);

        verify(dao).selectItemPartnerPriceList(argThat(p -> Boolean.FALSE.equals(p.get("includeHistory"))));
        verify(dao).selectItemPartnerPriceList(argThat(p -> Boolean.TRUE.equals(p.get("includeHistory"))));
    }

    @Test
    void importAllowsBlankCustomerCodeAsDefaultPriceAndValidatesNewFields() throws Exception {
        ItemPartnerPriceImportRowVO blank = row(2);
        blank.setCustomerCode("");
        ItemPartnerPriceImportResolutionVO resolution = resolved(2);
        resolution.setCustomerId(null);
        resolution.setCustomerCode(null);
        resolution.setCustomerName(null);
        ItemPartnerPriceImportRowVO bad = row(3);
        bad.setCustomerCode("000202");
        bad.setForeignUnitPrice("3.00");
        bad.setCurrency("");
        bad.setVatIncludedAt("X");
        when(dao.resolveImportRows(anyMap())).thenReturn(java.util.Arrays.asList(resolution, resolved(3)));

        ItemPartnerPriceImportValidationVO result =
                service.validateImport(9L, java.util.Arrays.asList(blank, bad));

        assertThat(result.getRows().get(0).getErrors()).isEmpty();
        assertThat(result.getRows().get(1).getErrors()).extracting("code")
                .contains("INVALID_CURRENCY", "INVALID_VAT_INCLUDED_AT");
    }

    @Test
    void deleteRemovesCurrentRowAndReopensThePredecessorWithTheDeletedRowEndDate() throws Exception {
        ItemPartnerPriceVO current = existingRow(LocalDate.now().minusDays(10), null);
        current.setUseAt("Y");
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(current);
        when(dao.selectPredecessorPriceId(anyMap())).thenReturn(33L);
        when(dao.deleteItemPartnerPrice(anyMap())).thenReturn(1);

        service.deletePrice(9L, "00101", 44L);

        org.mockito.InOrder order = inOrder(dao);
        order.verify(dao).reopenPrice(argThat(params ->
                Long.valueOf(33L).equals(params.get("predecessorId")) && params.get("endDt") == null
                        && "00101".equals(params.get("updatedBy"))));
        order.verify(dao).deleteItemPartnerPrice(argThat(params -> Long.valueOf(44L).equals(params.get("priceId"))));
    }

    @Test
    void deleteAllowsFutureRowAndSkipsReopenWhenThereIsNoPredecessorOrRowIsInactive() throws Exception {
        ItemPartnerPriceVO future = existingRow(LocalDate.now().plusDays(10), LocalDate.now().plusDays(20));
        future.setUseAt("Y");
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(future);
        when(dao.selectPredecessorPriceId(anyMap())).thenReturn(null);
        when(dao.deleteItemPartnerPrice(anyMap())).thenReturn(1);
        service.deletePrice(9L, "00101", 44L);
        verify(dao, never()).reopenPrice(anyMap());
        verify(dao).deleteItemPartnerPrice(anyMap());

        reset(dao);
        ItemPartnerPriceVO inactive = existingRow(LocalDate.now().minusDays(10), null);
        inactive.setUseAt("N");
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(inactive);
        when(dao.deleteItemPartnerPrice(anyMap())).thenReturn(1);
        service.deletePrice(9L, "00101", 44L);
        verify(dao, never()).selectPredecessorPriceId(anyMap());
        verify(dao, never()).reopenPrice(anyMap());
    }

    @Test
    void deleteRejectsPastRowAndInvalidInput() throws Exception {
        ItemPartnerPriceVO past = existingRow(LocalDate.now().minusDays(30), LocalDate.now().minusDays(1));
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(past);

        assertThatThrownBy(() -> service.deletePrice(9L, "00101", 44L))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("과거");
        verify(dao, never()).deleteItemPartnerPrice(anyMap());
        assertThatThrownBy(() -> service.deletePrice(9L, "00101", 0L)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.deletePrice(0L, "00101", 44L)).isInstanceOf(IllegalArgumentException.class);
    }

    private void stubCreate() throws Exception {
        ItemPartnerPriceVO saved = new ItemPartnerPriceVO();
        saved.setPriceId(55L);
        when(dao.selectActiveMaterial(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.selectActiveCustomer(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.existsCommonCode(anyMap())).thenReturn(true);
        when(dao.selectPriceIdByBusinessKey(anyMap())).thenReturn(null);
        when(dao.selectOverlappingPriceId(anyMap())).thenReturn(null);
        when(dao.insertItemPartnerPrice(anyMap())).thenReturn(55L);
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(saved);
    }

    private ItemPartnerPriceVO existingRow(LocalDate start, LocalDate end) {
        ItemPartnerPriceVO row = new ItemPartnerPriceVO();
        row.setPriceId(44L);
        row.setMaterialId(101L);
        row.setCustomerId(201L);
        row.setTradeType("매입");
        row.setStartDt(start.toString());
        row.setEndDt(end == null ? null : end.toString());
        return row;
    }

    private ItemPartnerPriceImportRowVO row(int sourceRow) {
        ItemPartnerPriceImportRowVO row = new ItemPartnerPriceImportRowVO();
        row.setSourceRowNumber(sourceRow);
        row.setTradeType("매입");
        row.setMaterialCode("000101");
        row.setCustomerCode("000201");
        row.setUnitPrice("1250.50");
        row.setStartDt("2026-10-01");
        row.setUseAt("Y");
        return row;
    }

    private ItemPartnerPriceImportResolutionVO resolved(int sourceRow) {
        ItemPartnerPriceImportResolutionVO result = new ItemPartnerPriceImportResolutionVO();
        result.setSourceRowNumber(sourceRow);
        result.setMaterialId(101L);
        result.setMaterialCode("000101");
        result.setMaterialName("Flour");
        result.setCustomerId(201L);
        result.setCustomerCode("000201");
        result.setCustomerName("Mill");
        result.setExistingPriceId(null);
        return result;
    }

    private ItemPartnerPriceSaveRequestVO validPayload(Long materialId, Long customerId) {
        ItemPartnerPriceSaveRequestVO payload = new ItemPartnerPriceSaveRequestVO();
        payload.setMaterialId(materialId);
        payload.setCustomerId(customerId);
        payload.setTradeType("매입");
        payload.setUnitPrice(new BigDecimal("1250.50"));
        payload.setCurrency("KRW");
        payload.setStartDt("2026-10-01");
        payload.setUseAt("Y");
        return payload;
    }
}
