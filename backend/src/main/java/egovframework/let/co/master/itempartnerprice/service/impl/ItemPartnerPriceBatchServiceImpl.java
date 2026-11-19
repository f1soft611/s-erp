package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceBatchService;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

@Service("itemPartnerPriceBatchService")
public class ItemPartnerPriceBatchServiceImpl implements ItemPartnerPriceBatchService {
    private final ItemPartnerPriceService service;

    public ItemPartnerPriceBatchServiceImpl(ItemPartnerPriceService service) {
        this.service = service;
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
        return result;
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
