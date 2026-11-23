package egovframework.let.co.master.itempartnerprice.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchChangeSetVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceChangeVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceAccessService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

/**
 * 단가등록 거래구분별 메뉴 권한 검사 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.23
 * @version 1.0
 */
@Service("itemPriceAccessService")
public class ItemPriceAccessServiceImpl implements ItemPriceAccessService {

    static final String PURCHASE = "매입";
    static final String SALES = "매출";
    static final String PURCHASE_PAGE_KEY = "item-purchase-prices";
    static final String SALES_PAGE_KEY = "item-sales-prices";

    private final SystemMenuService systemMenuService;
    private final ItemPartnerPriceDAO dao;

    public ItemPriceAccessServiceImpl(SystemMenuService systemMenuService, ItemPartnerPriceDAO dao) {
        this.systemMenuService = systemMenuService;
        this.dao = dao;
    }

    @Override
    public Long requirePermission(LoginVO user, String tradeType, Operation operation) throws Exception {
        Long tenantId = requireTenant(user);
        String pageKey = pageKey(tradeType);
        MyMenuResponseVO tree = systemMenuService.getMyMenuTree(tenantId, user.getId(), user.getRoleId(),
                user.getRoleCode());
        if (tree != null && tree.getMenus() != null) {
            for (MenuTreeNodeVO module : tree.getMenus()) {
                List<String> segments = pathSegments(module.getPath());
                if (!segments.isEmpty() && "co".equals(segments.get(0))
                        && hasPermission(module.getChildren(), pageKey, operation)) {
                    return tenantId;
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
    }

    @Override
    public void requireImportPermission(LoginVO user, List<ItemPartnerPriceImportRowVO> rows) throws Exception {
        requireTenant(user);
        Set<String> tradeTypes = new LinkedHashSet<String>();
        if (rows != null) {
            for (ItemPartnerPriceImportRowVO row : rows) {
                if (row != null) {
                    tradeTypes.add(normalize(row.getTradeType()));
                }
            }
        }
        for (String tradeType : tradeTypes) {
            requirePermission(user, tradeType, Operation.CREATE);
        }
    }

    @Override
    public void requireBatchPermission(LoginVO user, ItemPartnerPriceBatchSaveRequestVO payload) throws Exception {
        Long tenantId = requireTenant(user);
        ItemPartnerPriceBatchChangeSetVO changes = payload == null ? null : payload.getPrices();
        if (changes == null) {
            return;
        }
        Set<String> create = new LinkedHashSet<String>();
        Set<String> update = new LinkedHashSet<String>();
        Set<String> delete = new LinkedHashSet<String>();
        for (ItemPartnerPriceChangeVO row : safe(changes.getInsertedRows())) {
            if (row != null) {
                create.add(normalize(row.getTradeType()));
            }
        }
        List<Long> updatedIds = new ArrayList<Long>();
        for (ItemPartnerPriceChangeVO row : safe(changes.getUpdatedRows())) {
            if (row == null) {
                continue;
            }
            update.add(normalize(row.getTradeType()));
            addPriceId(updatedIds, row.getPriceId());
        }
        List<Long> deletedIds = new ArrayList<Long>();
        for (ItemPartnerPriceChangeVO row : safe(changes.getDeletedRows())) {
            if (row != null) {
                addPriceId(deletedIds, row.getPriceId());
            }
        }
        update.addAll(storedTradeTypes(tenantId, updatedIds));
        delete.addAll(storedTradeTypes(tenantId, deletedIds));
        // 모든 검사를 마친 뒤에만 저장을 시작하도록, 여기서 한꺼번에 확인한다.
        for (String tradeType : create) {
            requirePermission(user, tradeType, Operation.CREATE);
        }
        for (String tradeType : update) {
            requirePermission(user, tradeType, Operation.UPDATE);
        }
        for (String tradeType : delete) {
            requirePermission(user, tradeType, Operation.DELETE);
        }
    }

    private Set<String> storedTradeTypes(Long tenantId, List<Long> priceIds) throws Exception {
        Set<String> found = new LinkedHashSet<String>();
        if (priceIds.isEmpty()) {
            return found;
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("priceIds", priceIds);
        List<String> types = dao.selectTradeTypesByPriceIds(params);
        if (types != null) {
            for (String type : types) {
                if (StringUtils.hasText(type)) {
                    found.add(type.trim());
                }
            }
        }
        return found;
    }

    private void addPriceId(List<Long> ids, String raw) {
        if (!StringUtils.hasText(raw)) {
            return;
        }
        try {
            long id = Long.parseLong(raw.trim());
            if (id > 0L) {
                ids.add(id);
            }
        } catch (NumberFormatException ex) {
            // 신규 행의 로컬 ID 등은 저장 단계의 검증이 처리한다.
        }
    }

    private <T> List<T> safe(List<T> values) {
        return values == null ? Collections.<T>emptyList() : values;
    }

    private Long requireTenant(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        return user.getTenantId();
    }

    private String normalize(String tradeType) {
        String value = tradeType == null ? "" : tradeType.trim();
        if (!PURCHASE.equals(value) && !SALES.equals(value)) {
            throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
        }
        return value;
    }

    private String pageKey(String tradeType) {
        return PURCHASE.equals(normalize(tradeType)) ? PURCHASE_PAGE_KEY : SALES_PAGE_KEY;
    }

    private boolean hasPermission(List<MenuTreeNodeVO> nodes, String pageKey, Operation operation) {
        if (nodes == null) {
            return false;
        }
        for (MenuTreeNodeVO node : nodes) {
            List<String> segments = pathSegments(node.getPath());
            MenuPermissionVO permissions = node.getPermissions();
            if (!segments.isEmpty() && pageKey.equals(segments.get(segments.size() - 1))
                    && permissions != null && permits(permissions, operation)) {
                return true;
            }
            if (hasPermission(node.getChildren(), pageKey, operation)) {
                return true;
            }
        }
        return false;
    }

    private List<String> pathSegments(String path) {
        List<String> segments = new ArrayList<String>();
        if (path != null) {
            for (String segment : path.split("/")) {
                if (!segment.isEmpty()) {
                    segments.add(segment);
                }
            }
        }
        return segments;
    }

    private boolean permits(MenuPermissionVO permissions, Operation operation) {
        switch (operation) {
            case CREATE:
                return permissions.isCreate();
            case UPDATE:
                return permissions.isUpdate();
            case DELETE:
                return permissions.isDelete();
            default:
                return permissions.isRead() || permissions.isCreate() || permissions.isUpdate();
        }
    }
}
