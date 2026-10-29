package egovframework.let.co.master.itempartnerprice.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportErrorVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportResolutionVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowResultVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportRowVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceImportValidationVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSearchCondition;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceSaveRequestVO;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPartnerPriceVO;
import egovframework.let.co.master.itempartnerprice.domain.repository.ItemPartnerPriceDAO;
import egovframework.let.co.master.itempartnerprice.service.ItemPartnerPriceService;

@Service("itemPartnerPriceService")
public class ItemPartnerPriceServiceImpl extends EgovAbstractServiceImpl implements ItemPartnerPriceService {
    private static final Set<String> TRADE_TYPES = new HashSet<String>();
    static {
        TRADE_TYPES.add("매입");
        TRADE_TYPES.add("매출");
    }

    private final ItemPartnerPriceDAO dao;

    public ItemPartnerPriceServiceImpl(ItemPartnerPriceDAO dao) {
        this.dao = dao;
    }

    @Override
    public List<ItemPartnerPriceVO> listPrices(Long tenantId, ItemPartnerPriceSearchCondition condition)
            throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        if (condition != null) {
            putSearch(params, "keyword", condition.getKeyword());
            if (StringUtils.hasText(condition.getTradeType())) {
                String tradeType = condition.getTradeType().trim();
                if (!TRADE_TYPES.contains(tradeType)) {
                    throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
                }
                params.put("tradeType", tradeType);
            }
            if (StringUtils.hasText(condition.getEffectiveOn())) {
                params.put("effectiveOn", date(condition.getEffectiveOn(), "적용 기준일"));
            }
            if (StringUtils.hasText(condition.getUseAt())) {
                params.put("useAt", useAt(condition.getUseAt()));
            }
        }
        return dao.selectItemPartnerPriceList(params);
    }

    @Override
    public ItemPartnerPriceImportValidationVO validateImport(Long tenantId, List<ItemPartnerPriceImportRowVO> rows)
            throws Exception {
        tenantParams(tenantId);
        if (rows == null || rows.isEmpty()) {
            throw new IllegalArgumentException("검증할 엑셀 행이 없습니다.");
        }
        if (rows.size() > 1000) {
            throw new IllegalArgumentException("엑셀은 한 번에 1,000행까지 검증할 수 있습니다.");
        }

        List<Map<String, Object>> requestRows = new ArrayList<Map<String, Object>>();
        List<ItemPartnerPriceImportRowResultVO> results = new ArrayList<ItemPartnerPriceImportRowResultVO>();
        Set<Integer> sourceNumbers = new HashSet<Integer>();
        for (ItemPartnerPriceImportRowVO row : rows) {
            if (row == null || row.getSourceRowNumber() == null || row.getSourceRowNumber() < 2) {
                throw new IllegalArgumentException("엑셀 원본 행 번호는 2 이상이어야 합니다.");
            }
            if (!sourceNumbers.add(row.getSourceRowNumber())) {
                throw new IllegalArgumentException("엑셀 원본 행 번호가 중복되었습니다.");
            }
            ItemPartnerPriceImportRowResultVO result = new ItemPartnerPriceImportRowResultVO();
            result.setSourceRowNumber(row.getSourceRowNumber());
            results.add(result);
            validateImportValues(row, result);
            Map<String, Object> queryRow = new HashMap<String, Object>();
            queryRow.put("sourceRowNumber", row.getSourceRowNumber());
            queryRow.put("materialCode", safeText(row.getMaterialCode()));
            queryRow.put("customerCode", safeText(row.getCustomerCode()));
            queryRow.put("tradeType", safeText(row.getTradeType()));
            queryRow.put("startDt", validDate(safeText(row.getStartDt()))
                    ? safeText(row.getStartDt()) : null);
            requestRows.add(queryRow);
        }

        Map<String, Object> params = tenantParams(tenantId);
        params.put("rows", requestRows);
        List<ItemPartnerPriceImportResolutionVO> resolved = dao.resolveImportRows(params);
        Map<Integer, ItemPartnerPriceImportResolutionVO> bySourceRow =
                new HashMap<Integer, ItemPartnerPriceImportResolutionVO>();
        if (resolved != null) {
            for (ItemPartnerPriceImportResolutionVO resolution : resolved) {
                bySourceRow.put(resolution.getSourceRowNumber(), resolution);
            }
        }

        Set<String> fileKeys = new HashSet<String>();
        for (int i = 0; i < rows.size(); i++) {
            ItemPartnerPriceImportRowVO row = rows.get(i);
            ItemPartnerPriceImportRowResultVO result = results.get(i);
            ItemPartnerPriceImportResolutionVO resolution = bySourceRow.get(row.getSourceRowNumber());
            if (resolution == null) {
                addError(result, "MASTER_LOOKUP_FAILED", "엑셀 " + row.getSourceRowNumber()
                        + "행의 품목/거래처 확인 결과를 받지 못했습니다.");
                continue;
            }
            if (resolution.getMaterialId() == null) {
                addError(result, "ITEM_NOT_FOUND", "엑셀 " + row.getSourceRowNumber()
                        + "행의 품목코드가 현재 테넌트의 사용 가능한 품목에 없습니다.");
            } else {
                result.setMaterialId(resolution.getMaterialId());
                result.setMaterialCode(resolution.getMaterialCode());
                result.setMaterialName(resolution.getMaterialName());
            }
            if (resolution.getCustomerId() == null) {
                addError(result, "CUSTOMER_NOT_FOUND", "엑셀 " + row.getSourceRowNumber()
                        + "행의 거래처코드가 현재 테넌트의 사용 가능한 거래처에 없습니다.");
            } else {
                result.setCustomerId(resolution.getCustomerId());
                result.setCustomerCode(resolution.getCustomerCode());
                result.setCustomerName(resolution.getCustomerName());
            }
            if (resolution.getExistingPriceId() != null) {
                addError(result, "EXISTING_PRICE_KEY", "엑셀 " + row.getSourceRowNumber()
                        + "행의 품목·거래처·거래구분·적용시작일 단가가 이미 존재합니다.");
            }
            if (resolution.getMaterialId() != null && resolution.getCustomerId() != null
                    && TRADE_TYPES.contains(safeText(row.getTradeType()))
                    && validDate(safeText(row.getStartDt()))) {
                String key = businessKey(resolution.getMaterialId(), resolution.getCustomerId(),
                        row.getTradeType().trim(), row.getStartDt().trim());
                if (!fileKeys.add(key)) {
                    addError(result, "DUPLICATE_FILE_KEY", "엑셀 " + row.getSourceRowNumber()
                            + "행이 파일 내 다른 행과 같은 단가 키를 사용합니다.");
                }
            }
        }
        ItemPartnerPriceImportValidationVO validation = new ItemPartnerPriceImportValidationVO();
        validation.setRows(results);
        return validation;
    }

    private void validateImportValues(ItemPartnerPriceImportRowVO row, ItemPartnerPriceImportRowResultVO result) {
        int sourceRow = row.getSourceRowNumber();
        String tradeType = safeText(row.getTradeType());
        if (!TRADE_TYPES.contains(tradeType)) {
            addError(result, "INVALID_TRADE_TYPE", "엑셀 " + sourceRow + "행의 거래구분은 매입 또는 매출이어야 합니다.");
        }
        if (!validCode(row.getMaterialCode())) {
            addError(result, "INVALID_ITEM_CODE", "엑셀 " + sourceRow + "행의 품목코드를 입력해 주세요(최대 20자).");
        }
        if (!validCode(row.getCustomerCode())) {
            addError(result, "INVALID_CUSTOMER_CODE", "엑셀 " + sourceRow + "행의 거래처코드를 입력해 주세요(최대 20자).");
        }
        if (!validAmount(row.getUnitPrice(), false)) {
            addError(result, "INVALID_UNIT_PRICE", "엑셀 " + sourceRow + "행의 단가는 0 이상, 소수 둘째 자리까지 입력해 주세요.");
        }
        String currency = safeText(row.getCurrency());
        if (currency.length() > 10) {
            addError(result, "INVALID_CURRENCY", "엑셀 " + sourceRow + "행의 통화는 10자 이하여야 합니다.");
        }
        if (!validDate(safeText(row.getStartDt()))) {
            addError(result, "INVALID_START_DATE", "엑셀 " + sourceRow + "행의 적용 시작일은 YYYY-MM-DD 형식이어야 합니다.");
        }
        String endDt = safeText(row.getEndDt());
        if (!endDt.isEmpty() && (!validDate(endDt)
                || validDate(safeText(row.getStartDt())) && dateBefore(endDt, row.getStartDt()))) {
            addError(result, "INVALID_END_DATE", "엑셀 " + sourceRow + "행의 적용 종료일은 시작일 이후의 YYYY-MM-DD여야 합니다.");
        }
        if (!validAmount(row.getMoq(), true)) {
            addError(result, "INVALID_MOQ", "엑셀 " + sourceRow + "행의 최소주문수량은 0 이상, 소수 둘째 자리까지 입력해 주세요.");
        }
        String useAtValue = safeText(row.getUseAt());
        if (!useAtValue.isEmpty() && !"Y".equals(useAtValue) && !"N".equals(useAtValue)) {
            addError(result, "INVALID_USE_AT", "엑셀 " + sourceRow + "행의 사용여부는 Y 또는 N이어야 합니다.");
        }
    }

    private boolean validAmount(String raw, boolean optional) {
        String value = safeText(raw);
        if (value.isEmpty()) return optional;
        if (!value.matches("[0-9]{1,13}(\\.[0-9]{1,2})?")) return false;
        try {
            return new BigDecimal(value).precision() <= 15;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private boolean validCode(String raw) {
        String value = safeText(raw);
        return !value.isEmpty() && value.length() <= 20;
    }

    private boolean validDate(String value) {
        if (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return false;
        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private boolean dateBefore(String end, String start) {
        return LocalDate.parse(end).isBefore(LocalDate.parse(start));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ItemPartnerPriceVO createPrice(Long tenantId, String actor, ItemPartnerPriceSaveRequestVO payload)
            throws Exception {
        Map<String, Object> params = saveParams(tenantId, actor, payload);
        requireActiveMasters(params);
        ensureUniqueKey(params, null);
        try {
            Long id = dao.insertItemPartnerPrice(params);
            if (id == null) throw new IllegalStateException("단가 등록 결과를 확인할 수 없습니다.");
            return findById(tenantId, id);
        } catch (DuplicateKeyException ex) {
            throw duplicateKey();
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ItemPartnerPriceVO updatePrice(Long tenantId, String actor, Long priceId,
            ItemPartnerPriceSaveRequestVO payload) throws Exception {
        if (priceId == null || priceId <= 0) throw new IllegalArgumentException("올바른 단가 ID가 필요합니다.");
        ItemPartnerPriceVO existing = findById(tenantId, priceId);
        Map<String, Object> params = saveParams(tenantId, actor, payload);
        params.put("priceId", priceId);
        if (!existing.getMaterialId().equals(params.get("materialId"))) requireActiveMaterial(params);
        if (!existing.getCustomerId().equals(params.get("customerId"))) requireActiveCustomer(params);
        ensureUniqueKey(params, priceId);
        try {
            if (dao.updateItemPartnerPrice(params) == 0) throw notFound();
            return findById(tenantId, priceId);
        } catch (DuplicateKeyException ex) {
            throw duplicateKey();
        }
    }

    private void requireActiveMasters(Map<String, Object> params) throws Exception {
        requireActiveMaterial(params);
        requireActiveCustomer(params);
    }

    private void requireActiveMaterial(Map<String, Object> params) throws Exception {
        if (dao.selectActiveMaterial(params) == null) {
            throw new IllegalArgumentException("사용 가능한 품목을 현재 테넌트에서 찾을 수 없습니다.");
        }
    }

    private void requireActiveCustomer(Map<String, Object> params) throws Exception {
        if (dao.selectActiveCustomer(params) == null) {
            throw new IllegalArgumentException("사용 가능한 거래처를 현재 테넌트에서 찾을 수 없습니다.");
        }
    }

    private void ensureUniqueKey(Map<String, Object> params, Long excludePriceId) throws Exception {
        params.put("excludePriceId", excludePriceId);
        if (dao.selectPriceIdByBusinessKey(params) != null) throw duplicateKey();
    }

    private ItemPartnerPriceVO findById(Long tenantId, Long priceId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("priceId", priceId);
        ItemPartnerPriceVO row = dao.selectItemPartnerPriceById(params);
        if (row == null) throw notFound();
        return row;
    }

    private Map<String, Object> saveParams(Long tenantId, String actor, ItemPartnerPriceSaveRequestVO payload) {
        Map<String, Object> params = tenantParams(tenantId);
        if (payload == null) throw new IllegalArgumentException("단가 저장 요청이 비어 있습니다.");
        if (payload.getMaterialId() == null || payload.getMaterialId() <= 0
                || payload.getCustomerId() == null || payload.getCustomerId() <= 0) {
            throw new IllegalArgumentException("품목과 거래처를 선택해 주세요.");
        }
        if (!TRADE_TYPES.contains(safeText(payload.getTradeType()))) {
            throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
        }
        if (payload.getUnitPrice() == null || !validAmount(payload.getUnitPrice().toPlainString(), false)) {
            throw new IllegalArgumentException("단가는 0 이상, 소수 둘째 자리까지 입력해 주세요.");
        }
        BigDecimal moq = payload.getMoq();
        if (moq != null && !validAmount(moq.toPlainString(), false)) {
            throw new IllegalArgumentException("최소주문수량은 0 이상, 소수 둘째 자리까지 입력해 주세요.");
        }
        String currency = safeText(payload.getCurrency());
        if (currency.isEmpty()) currency = "KRW";
        if (currency.length() > 10) throw new IllegalArgumentException("통화는 10자 이하여야 합니다.");
        String start = date(payload.getStartDt(), "적용 시작일");
        String end = null;
        if (StringUtils.hasText(payload.getEndDt())) {
            end = date(payload.getEndDt(), "적용 종료일");
            if (LocalDate.parse(end).isBefore(LocalDate.parse(start))) {
                throw new IllegalArgumentException("적용 종료일은 시작일보다 빠를 수 없습니다.");
            }
        }
        String useAtValue = StringUtils.hasText(payload.getUseAt()) ? useAt(payload.getUseAt()) : "Y";
        if (!StringUtils.hasText(actor) || actor.trim().length() > 10) {
            throw new IllegalArgumentException("인증 사용자 정보를 확인할 수 없습니다.");
        }
        params.put("materialId", payload.getMaterialId());
        params.put("customerId", payload.getCustomerId());
        params.put("tradeType", payload.getTradeType().trim());
        params.put("unitPrice", payload.getUnitPrice());
        params.put("currency", currency);
        params.put("startDt", start);
        params.put("endDt", end);
        params.put("moq", moq);
        params.put("useAt", useAtValue);
        params.put("createdBy", actor.trim());
        params.put("updatedBy", actor.trim());
        return params;
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("인증 테넌트 정보가 필요합니다.");
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        return params;
    }

    private void putSearch(Map<String, Object> params, String key, String value) {
        if (StringUtils.hasText(value)) params.put(key, value.trim());
    }

    private String date(String value, String label) {
        if (!StringUtils.hasText(value)) throw new IllegalArgumentException(label + "은 필수입니다.");
        String normalized = value.trim();
        if (!validDate(normalized)) throw new IllegalArgumentException(label + "은 YYYY-MM-DD 형식이어야 합니다.");
        return normalized;
    }

    private String useAt(String value) {
        String normalized = value.trim();
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("사용여부는 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String businessKey(Long materialId, Long customerId, String tradeType, String startDt) {
        return materialId + "|" + customerId + "|" + tradeType + "|" + startDt;
    }

    private void addError(ItemPartnerPriceImportRowResultVO row, String code, String message) {
        row.getErrors().add(new ItemPartnerPriceImportErrorVO(code, message));
    }

    private IllegalArgumentException duplicateKey() {
        return new IllegalArgumentException("같은 품목·거래처·거래구분·적용시작일의 단가가 이미 존재합니다.");
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "단가 정보를 찾을 수 없습니다.");
    }
}
