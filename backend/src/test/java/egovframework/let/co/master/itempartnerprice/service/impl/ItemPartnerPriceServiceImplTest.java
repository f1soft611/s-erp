package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
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
        ItemPartnerPriceVO saved = new ItemPartnerPriceVO();
        saved.setPriceId(44L);
        when(dao.selectItemPartnerPriceById(anyMap())).thenReturn(existing, saved);
        when(dao.selectActiveCustomer(anyMap())).thenReturn(new ItemPartnerPriceVO());
        when(dao.selectPriceIdByBusinessKey(anyMap())).thenReturn(null);
        when(dao.updateItemPartnerPrice(anyMap())).thenReturn(1);

        service.updatePrice(9L, "00101", 44L, validPayload(101L, 202L));

        verify(dao, never()).selectActiveMaterial(anyMap());
        verify(dao).selectActiveCustomer(anyMap());
        verify(dao).updateItemPartnerPrice(anyMap());
    }

    private ItemPartnerPriceImportRowVO row(int sourceRow) {
        ItemPartnerPriceImportRowVO row = new ItemPartnerPriceImportRowVO();
        row.setSourceRowNumber(sourceRow);
        row.setTradeType("매입");
        row.setMaterialCode("000101");
        row.setCustomerCode("000201");
        row.setUnitPrice("1250.50");
        row.setCurrency("KRW");
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
