package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchChangeSetVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceBatchSaveResultVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceChangeVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.service.ItemDefaultSupplierService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

@Service("itemPartnerPriceBatchService")
public class ItemPartnerPriceBatchServiceImpl implements ItemPartnerPriceBatchService {
    private static final String PURCHASE = "매입";

    private final ItemPartnerPriceService service;
    private final ItemDefaultSupplierService defaultSupplierService;

    public ItemPartnerPriceBatchServiceImpl(ItemPartnerPriceService service,
            ItemDefaultSupplierService defaultSupplierService) {
        this.service = service;
        this.defaultSupplierService = defaultSupplierService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ItemPartnerPriceBatchSaveResultVO saveBatch(Long tenantId, String actor,
            ItemPartnerPriceBatchSaveRequestVO payload) throws Exception {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        if (!StringUtils.hasText(actor) || actor.trim().length() > 10) {
            throw new IllegalArgumentException("인증 사용자 정보를 확인할 수 없습니다.");
        }
        if (payload == null || payload.getPrices() == null) {
            throw new IllegalArgumentException("저장할 단가 변경 집합이 필요합니다.");
        }
        ItemPartnerPriceBatchChangeSetVO changes = payload.getPrices();
        if (changes.getInsertedRows() == null || changes.getUpdatedRows() == null
                || changes.getDeletedRows() == null) {
            throw new IllegalArgumentException("신규·수정·삭제 행 목록을 확인해 주세요.");
        }
        if (changes.getInsertedRows().isEmpty() && changes.getUpdatedRows().isEmpty()
                && changes.getDeletedRows().isEmpty()) {
            throw new IllegalArgumentException("저장할 단가 변경 사항이 없습니다.");
        }
        validateRequestKeys(changes);
        Map<Long, Long> setDefaults = validateDefaultSupplierRows(changes);

        // 기본 거래처 정리 대상 품목: 삭제·수정되는 단가의 원래 품목과 요청에 담긴 품목
        Set<Long> touchedMaterialIds = new LinkedHashSet<Long>();
        List<Long> existingPriceIds = new ArrayList<Long>();
        for (ItemPartnerPriceChangeVO row : changes.getDeletedRows()) existingPriceIds.add(parsePriceId(row.getPriceId()));
        for (ItemPartnerPriceChangeVO row : changes.getUpdatedRows()) existingPriceIds.add(parsePriceId(row.getPriceId()));
        touchedMaterialIds.addAll(defaultSupplierService.findMaterialIdsByPriceIds(tenantId, existingPriceIds));
        // 기본 거래처 필수 검증 대상: 매입 단가가 바뀌는 품목(저장된 거래구분 또는 요청 거래구분이 매입)
        Set<Long> purchaseMaterialIds = new LinkedHashSet<Long>(
                defaultSupplierService.findMaterialIdsByPriceIds(tenantId, existingPriceIds, PURCHASE));
        for (ItemPartnerPriceChangeVO row : changes.getInsertedRows()) {
            if (row.getMaterialId() == null) continue;
            touchedMaterialIds.add(row.getMaterialId());
            if (isPurchase(row)) purchaseMaterialIds.add(row.getMaterialId());
        }
        for (ItemPartnerPriceChangeVO row : changes.getUpdatedRows()) {
            if (row.getMaterialId() == null) continue;
            touchedMaterialIds.add(row.getMaterialId());
            if (isPurchase(row)) purchaseMaterialIds.add(row.getMaterialId());
        }

        ItemPartnerPriceBatchSaveResultVO result = new ItemPartnerPriceBatchSaveResultVO();
        // 삭제를 가장 먼저 처리해 같은 키를 지우고 다시 등록하는 오등록 정정을 한 번의 저장으로 할 수 있게 한다.
        for (ItemPartnerPriceChangeVO row : changes.getDeletedRows()) {
            service.deletePrice(tenantId, actor, parsePriceId(row.getPriceId()));
        }
        // 수정을 먼저 반영해야 신규 행의 직전 행 자동 종료가 수정 값을 덮어쓰지 않는다.
        List<ItemPartnerPriceVO> updatedPrices = new ArrayList<ItemPartnerPriceVO>();
        for (ItemPartnerPriceChangeVO row : changes.getUpdatedRows()) {
            Long priceId = parsePriceId(row.getPriceId());
            ItemPartnerPriceVO saved = service.updatePrice(tenantId, actor, priceId, row);
            updatedPrices.add(saved);
            result.getRowIdMappings().put(row.getPriceId(), saved.getPriceId());
        }
        // 신규 행은 적용 시작일 순으로 저장해야 먼저 시작한 행이 뒤 행에 의해 자동 종료된다.
        List<ItemPartnerPriceChangeVO> inserted = new ArrayList<ItemPartnerPriceChangeVO>(changes.getInsertedRows());
        Collections.sort(inserted, new Comparator<ItemPartnerPriceChangeVO>() {
            @Override
            public int compare(ItemPartnerPriceChangeVO left, ItemPartnerPriceChangeVO right) {
                return String.valueOf(left.getStartDt()).compareTo(String.valueOf(right.getStartDt()));
            }
        });
        Map<String, ItemPartnerPriceVO> insertedPrices = new LinkedHashMap<String, ItemPartnerPriceVO>();
        for (ItemPartnerPriceChangeVO row : inserted) {
            if (!StringUtils.hasText(row.getPriceId())) {
                throw new IllegalArgumentException("신규 단가의 로컬 행 ID가 필요합니다.");
            }
            ItemPartnerPriceVO saved = service.createPrice(tenantId, actor, row);
            insertedPrices.put(row.getPriceId(), saved);
            result.getRowIdMappings().put(row.getPriceId(), saved.getPriceId());
        }
        result.getPrices().addAll(insertedPrices.values());
        result.getPrices().addAll(updatedPrices);

        applyDefaultSupplierChanges(tenantId, actor, changes, setDefaults);
        result.getClearedDefaultMaterialIds().addAll(defaultSupplierService.clearOrphans(tenantId, touchedMaterialIds));
        requireDefaultSupplierForMultiCustomer(tenantId, purchaseMaterialIds);
        refreshDefaultSupplierFlags(tenantId, result.getPrices());
        return result;
    }

    private boolean isPurchase(ItemPartnerPriceChangeVO row) {
        return row.getTradeType() != null && PURCHASE.equals(row.getTradeType().trim());
    }

    /** 저장 반영 뒤 매입 단가 거래처가 2곳 이상인 품목은 기본 거래처가 있어야 한다. 위반하면 저장 전체를 되돌린다. */
    private void requireDefaultSupplierForMultiCustomer(Long tenantId, Set<Long> purchaseMaterialIds)
            throws Exception {
        List<String> missing = defaultSupplierService.findMaterialsMissingDefaultSupplier(tenantId, purchaseMaterialIds);
        if (missing.isEmpty()) return;
        StringBuilder names = new StringBuilder();
        for (int i = 0; i < missing.size() && i < 3; i++) {
            if (i > 0) names.append(", ");
            names.append(missing.get(i));
        }
        if (missing.size() > 3) names.append(" 외 ").append(missing.size() - 3).append("건");
        throw new IllegalArgumentException(
                "매입 거래처가 2곳 이상인 품목은 기본 거래처를 지정해야 합니다: " + names);
    }

    /**
     * 기본 거래처 지정 요청을 검증하고 품목별 지정 거래처를 돌려준다.
     * true는 거래처가 있는 사용 중 매입 단가에서만, 한 품목에는 한 거래처만 허용한다.
     */
    private Map<Long, Long> validateDefaultSupplierRows(ItemPartnerPriceBatchChangeSetVO changes) {
        Map<Long, Long> setDefaults = new LinkedHashMap<Long, Long>();
        List<ItemPartnerPriceChangeVO> rows = new ArrayList<ItemPartnerPriceChangeVO>();
        rows.addAll(changes.getInsertedRows());
        rows.addAll(changes.getUpdatedRows());
        for (ItemPartnerPriceChangeVO row : rows) {
            if (!Boolean.TRUE.equals(row.getDefaultSupplier())) continue;
            boolean purchase = row.getTradeType() != null && PURCHASE.equals(row.getTradeType().trim());
            boolean active = !StringUtils.hasText(row.getUseAt()) || "Y".equals(row.getUseAt().trim());
            if (!purchase || row.getCustomerId() == null || row.getMaterialId() == null || !active) {
                throw new IllegalArgumentException("기본 거래처는 거래처가 있는 매입 단가에만 지정할 수 있습니다.");
            }
            Long previous = setDefaults.put(row.getMaterialId(), row.getCustomerId());
            if (previous != null && !previous.equals(row.getCustomerId())) {
                throw new IllegalArgumentException("품목당 기본 거래처는 하나만 지정할 수 있습니다.");
            }
        }
        return setDefaults;
    }

    /** 단가 행 반영 뒤 기본 거래처를 지정하고, 해제 요청(현재 기본인 거래처만)을 처리한다. */
    private void applyDefaultSupplierChanges(Long tenantId, String actor, ItemPartnerPriceBatchChangeSetVO changes,
            Map<Long, Long> setDefaults) throws Exception {
        for (Map.Entry<Long, Long> entry : setDefaults.entrySet()) {
            defaultSupplierService.setDefault(tenantId, actor, entry.getKey(), entry.getValue());
        }
        List<ItemPartnerPriceChangeVO> rows = new ArrayList<ItemPartnerPriceChangeVO>();
        rows.addAll(changes.getInsertedRows());
        rows.addAll(changes.getUpdatedRows());
        for (ItemPartnerPriceChangeVO row : rows) {
            if (!Boolean.FALSE.equals(row.getDefaultSupplier())) continue;
            if (row.getMaterialId() == null || row.getCustomerId() == null) continue;
            if (setDefaults.containsKey(row.getMaterialId())) continue;
            defaultSupplierService.clearIfCurrent(tenantId, row.getMaterialId(), row.getCustomerId());
        }
    }

    /** 저장 결과 행의 기본 거래처 여부를 변경 반영 뒤의 값으로 갱신한다. */
    private void refreshDefaultSupplierFlags(Long tenantId, List<ItemPartnerPriceVO> prices) throws Exception {
        Set<Long> materialIds = new HashSet<Long>();
        for (ItemPartnerPriceVO price : prices) materialIds.add(price.getMaterialId());
        Map<Long, Long> defaults = defaultSupplierService.findDefaultSupplierIds(tenantId, materialIds);
        for (ItemPartnerPriceVO price : prices) {
            boolean isDefault = PURCHASE.equals(price.getTradeType()) && price.getCustomerId() != null
                    && price.getCustomerId().equals(defaults.get(price.getMaterialId()));
            price.setDefaultSupplier(isDefault);
        }
    }

    private void validateRequestKeys(ItemPartnerPriceBatchChangeSetVO changes) {
        Set<String> businessKeys = new HashSet<String>();
        Set<String> rowIds = new HashSet<String>();
        List<ItemPartnerPriceChangeVO> allRows = new ArrayList<ItemPartnerPriceChangeVO>();
        allRows.addAll(changes.getInsertedRows());
        allRows.addAll(changes.getUpdatedRows());
        for (ItemPartnerPriceChangeVO row : allRows) {
            if (row == null) throw new IllegalArgumentException("단가 변경 행이 비어 있습니다.");
            String key = businessKey(row);
            if (key != null && !businessKeys.add(key)) {
                throw new IllegalArgumentException("요청에 같은 품목·거래처·거래구분·적용시작일 단가가 중복되었습니다.");
            }
        }
        for (ItemPartnerPriceChangeVO row : changes.getInsertedRows()) {
            if (!StringUtils.hasText(row.getPriceId()) || !rowIds.add(row.getPriceId().trim())) {
                throw new IllegalArgumentException("신규 단가의 로컬 행 ID가 없거나 중복되었습니다.");
            }
        }
        Set<Long> updatedIds = new HashSet<Long>();
        for (ItemPartnerPriceChangeVO row : changes.getUpdatedRows()) {
            Long id = parsePriceId(row.getPriceId());
            if (!updatedIds.add(id)) throw new IllegalArgumentException("수정 단가 ID가 중복되었습니다.");
        }
        Set<Long> deletedIds = new HashSet<Long>();
        for (ItemPartnerPriceChangeVO row : changes.getDeletedRows()) {
            if (row == null) throw new IllegalArgumentException("삭제 단가 행이 비어 있습니다.");
            Long id = parsePriceId(row.getPriceId());
            if (!deletedIds.add(id)) throw new IllegalArgumentException("삭제 단가 ID가 중복되었습니다.");
            if (updatedIds.contains(id)) throw new IllegalArgumentException("같은 단가를 수정하면서 삭제할 수 없습니다.");
        }
    }

    private String businessKey(ItemPartnerPriceChangeVO row) {
        if (row.getMaterialId() == null
                || !StringUtils.hasText(row.getTradeType()) || !StringUtils.hasText(row.getStartDt())) {
            return null;
        }
        String startDt = row.getStartDt().trim();
        try {
            startDt = LocalDate.parse(startDt).toString();
        } catch (DateTimeParseException ex) {
            // 형식 오류는 저장 단계의 날짜 검증이 처리한다.
        }
        return row.getMaterialId() + "|" + (row.getCustomerId() == null ? "default" : row.getCustomerId())
                + "|" + row.getTradeType().trim() + "|" + startDt;
    }

    private Long parsePriceId(String raw) {
        if (!StringUtils.hasText(raw)) throw new IllegalArgumentException("수정 단가 ID가 필요합니다.");
        try {
            long id = Long.parseLong(raw.trim());
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("수정 단가 ID가 올바르지 않습니다.");
        }
    }
}
