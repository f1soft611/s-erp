package egovframework.let.co.master.itempartnerprice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchChangeSetVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceChangeVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceAccessService.Operation;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class ItemPriceAccessServiceImplTest {
    private final SystemMenuService menuService = mock(SystemMenuService.class);
    private final ItemPartnerPriceDAO dao = mock(ItemPartnerPriceDAO.class);
    private final ItemPriceAccessServiceImpl service = new ItemPriceAccessServiceImpl(menuService, dao);

    @Test
    void purchaseMenuPermissionDoesNotGrantSalesAndViceVersa() throws Exception {
        menus(node("item-purchase-prices", true, true, true, true));
        assertThat(service.requirePermission(user(), "매입", Operation.READ)).isEqualTo(9L);
        assertThat(service.requirePermission(user(), "매입", Operation.DELETE)).isEqualTo(9L);
        assertForbidden(() -> service.requirePermission(user(), "매출", Operation.READ));

        menus(node("item-sales-prices", true, false, false, false));
        assertThat(service.requirePermission(user(), "매출", Operation.READ)).isEqualTo(9L);
        assertForbidden(() -> service.requirePermission(user(), "매출", Operation.CREATE));
        assertForbidden(() -> service.requirePermission(user(), "매입", Operation.READ));
    }

    @Test
    void readIsAllowedByWritePermissionsButDeleteNeedsItsOwn() throws Exception {
        menus(node("item-purchase-prices", false, true, false, false));
        assertThat(service.requirePermission(user(), "매입", Operation.READ)).isEqualTo(9L);
        assertThat(service.requirePermission(user(), "매입", Operation.CREATE)).isEqualTo(9L);
        assertForbidden(() -> service.requirePermission(user(), "매입", Operation.UPDATE));
        assertForbidden(() -> service.requirePermission(user(), "매입", Operation.DELETE));
    }

    @Test
    void rejectsMissingAuthenticationBadTradeTypeAndMenusOutsideTheCoModule() throws Exception {
        assertThatThrownBy(() -> service.requirePermission(null, "매입", Operation.READ))
                .isInstanceOf(ResponseStatusException.class);
        menus(node("item-purchase-prices", true, true, true, true));
        assertThatThrownBy(() -> service.requirePermission(user(), "기타", Operation.READ))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.requirePermission(user(), null, Operation.READ))
                .isInstanceOf(IllegalArgumentException.class);

        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/materials");
        module.setChildren(Collections.singletonList(node("item-purchase-prices", true, true, true, true)));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(module));
        when(menuService.getMyMenuTree(anyLong(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(tree);
        assertForbidden(() -> service.requirePermission(user(), "매입", Operation.READ));
    }

    @Test
    void importChecksCreatePermissionForEveryTradeTypeInTheRows() throws Exception {
        menus(node("item-purchase-prices", true, true, false, false));
        service.requireImportPermission(user(), Arrays.asList(importRow("매입"), importRow("매입")));
        assertForbidden(() -> service.requireImportPermission(user(), Arrays.asList(importRow("매입"), importRow("매출"))));
        assertThatThrownBy(() -> service.requireImportPermission(user(), Collections.singletonList(importRow(" "))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void batchChecksCreateUpdateAndDeleteAgainstStoredTradeTypes() throws Exception {
        menus(node("item-purchase-prices", true, true, true, true), node("item-sales-prices", true, true, true, false));
        // 삭제할 단가 77은 DB에서 매입, 수정할 단가 12는 매출로 저장되어 있다.
        when(dao.selectTradeTypesByPriceIds(org.mockito.ArgumentMatchers.argThat(params ->
                params != null && Arrays.asList(77L).equals(params.get("priceIds"))))).thenReturn(Arrays.asList("매입"));
        when(dao.selectTradeTypesByPriceIds(org.mockito.ArgumentMatchers.argThat(params ->
                params != null && Arrays.asList(12L).equals(params.get("priceIds"))))).thenReturn(Arrays.asList("매출"));

        service.requireBatchPermission(user(), batch(
                Arrays.asList(row("new-1", "매입", null)), Arrays.asList(row("12", "매출", "12")),
                Arrays.asList(row("77", null, "77"))));
    }

    @Test
    void batchRejectsWhenAnyPartIsForbiddenAndUsesStoredTradeTypeForDeleteAndUpdate() throws Exception {
        // 매출 메뉴 권한만 있는 사용자가 매입 단가를 삭제하려는 요청(클라이언트가 거래구분을 속이지 못한다)
        menus(node("item-sales-prices", true, true, true, true));
        when(dao.selectTradeTypesByPriceIds(anyMap())).thenReturn(Arrays.asList("매입"));
        assertForbidden(() -> service.requireBatchPermission(user(), batch(
                new ArrayList<ItemPartnerPriceChangeVO>(), new ArrayList<ItemPartnerPriceChangeVO>(),
                Arrays.asList(row("77", null, "77")))));
        // 요청 값은 매출이지만 기존 행이 매입이면 수정도 거부
        assertForbidden(() -> service.requireBatchPermission(user(), batch(
                new ArrayList<ItemPartnerPriceChangeVO>(), Arrays.asList(row("12", "매출", "12")),
                new ArrayList<ItemPartnerPriceChangeVO>())));
        // 신규 행 거래구분이 비어 있으면 400
        assertThatThrownBy(() -> service.requireBatchPermission(user(), batch(
                Arrays.asList(row("new-1", "", null)), new ArrayList<ItemPartnerPriceChangeVO>(),
                new ArrayList<ItemPartnerPriceChangeVO>()))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void batchWithoutRowsSkipsTheStoredTradeTypeLookup() throws Exception {
        menus(node("item-purchase-prices", true, true, true, true));
        service.requireBatchPermission(user(), batch(Arrays.asList(row("new-1", "매입", null)),
                new ArrayList<ItemPartnerPriceChangeVO>(), new ArrayList<ItemPartnerPriceChangeVO>()));
        verify(dao, never()).selectTradeTypesByPriceIds(anyMap());
        verify(dao, never()).selectTradeTypesByPriceIds(eq(null));
        service.requireBatchPermission(user(), null);
    }

    private void menus(MenuTreeNodeVO... pages) throws Exception {
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setPath("/co");
        MenuTreeNodeVO group = new MenuTreeNodeVO();
        group.setPath("/co/master");
        group.setChildren(Arrays.asList(pages));
        module.setChildren(Collections.singletonList(group));
        MyMenuResponseVO tree = new MyMenuResponseVO();
        tree.setMenus(Collections.singletonList(module));
        when(menuService.getMyMenuTree(anyLong(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(tree);
    }

    private MenuTreeNodeVO node(String pageKey, boolean read, boolean create, boolean update, boolean delete) {
        MenuPermissionVO permissions = new MenuPermissionVO();
        permissions.setRead(read);
        permissions.setCreate(create);
        permissions.setUpdate(update);
        permissions.setDelete(delete);
        MenuTreeNodeVO node = new MenuTreeNodeVO();
        node.setPath("/co/master/" + pageKey);
        node.setPermissions(permissions);
        return node;
    }

    private LoginVO user() {
        LoginVO user = new LoginVO();
        user.setTenantId(9L);
        user.setId("u1");
        user.setRoleId(1L);
        user.setRoleCode("ROLE");
        return user;
    }

    private ItemPartnerPriceImportRowVO importRow(String tradeType) {
        ItemPartnerPriceImportRowVO row = new ItemPartnerPriceImportRowVO();
        row.setTradeType(tradeType);
        return row;
    }

    private ItemPartnerPriceChangeVO row(String tempId, String tradeType, String priceId) {
        ItemPartnerPriceChangeVO row = new ItemPartnerPriceChangeVO();
        row.setPriceId(priceId == null ? tempId : priceId);
        row.setTradeType(tradeType);
        return row;
    }

    private ItemPartnerPriceBatchSaveRequestVO batch(List<ItemPartnerPriceChangeVO> inserted,
            List<ItemPartnerPriceChangeVO> updated, List<ItemPartnerPriceChangeVO> deleted) {
        ItemPartnerPriceBatchChangeSetVO changes = new ItemPartnerPriceBatchChangeSetVO();
        changes.setInsertedRows(inserted);
        changes.setUpdatedRows(updated);
        changes.setDeletedRows(deleted);
        ItemPartnerPriceBatchSaveRequestVO request = new ItemPartnerPriceBatchSaveRequestVO();
        request.setPrices(changes);
        return request;
    }

    private void assertForbidden(ThrowingAction action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private interface ThrowingAction {
        void run() throws Exception;
    }
}
