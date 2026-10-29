package egovframework.let.co.master.itempartnerprice.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
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
        if (!changes.getDeletedRows().isEmpty()) {
            throw new IllegalArgumentException("단가 정보의 물리 삭제는 허용되지 않습니다. 사용여부를 변경해 주세요.");
        }
        if (changes.getInsertedRows().isEmpty() && changes.getUpdatedRows().isEmpty()) {
            throw new IllegalArgumentException("저장할 단가 변경 사항이 없습니다.");
        }
        validateRequestKeys(changes);

        ItemPartnerPriceBatchSaveResultVO result = new ItemPartnerPriceBatchSaveResultVO();
        for (ItemPartnerPriceChangeVO row : changes.getInsertedRows()) {
            if (!StringUtils.hasText(row.getPriceId())) {
                throw new IllegalArgumentException("신규 단가의 로컬 행 ID가 필요합니다.");
            }
            ItemPartnerPriceVO saved = service.createPrice(tenantId, actor, row);
            result.getPrices().add(saved);
            result.getRowIdMappings().put(row.getPriceId(), saved.getPriceId());
        }
        for (ItemPartnerPriceChangeVO row : changes.getUpdatedRows()) {
            Long priceId = parsePriceId(row.getPriceId());
            ItemPartnerPriceVO saved = service.updatePrice(tenantId, actor, priceId, row);
            result.getPrices().add(saved);
            result.getRowIdMappings().put(row.getPriceId(), saved.getPriceId());
        }
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
    }

    private String businessKey(ItemPartnerPriceChangeVO row) {
        if (row.getMaterialId() == null || row.getCustomerId() == null
                || !StringUtils.hasText(row.getTradeType()) || !StringUtils.hasText(row.getStartDt())) {
            return null;
        }
        String startDt = row.getStartDt().trim();
        try {
            startDt = LocalDate.parse(startDt).toString();
        } catch (DateTimeParseException ex) {
            return row.getMaterialId() + "|" + row.getCustomerId() + "|"
                    + row.getTradeType().trim() + "|" + startDt;
        }
        return row.getMaterialId() + "|" + row.getCustomerId() + "|"
                + row.getTradeType().trim() + "|" + startDt;
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
