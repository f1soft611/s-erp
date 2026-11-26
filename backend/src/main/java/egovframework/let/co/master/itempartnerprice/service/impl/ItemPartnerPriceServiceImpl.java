package egovframework.let.co.master.itempartnerprice.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.DecimalColumnContract;
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
import egovframework.let.sales.common.SalesDecimalPolicy;
import egovframework.let.system.policies.service.SystemPolicyService;

@Service("itemPartnerPriceService")
public class ItemPartnerPriceServiceImpl extends EgovAbstractServiceImpl implements ItemPartnerPriceService {
    private static final Set<String> TRADE_TYPES = new HashSet<String>();
    static {
        TRADE_TYPES.add("매입");
        TRADE_TYPES.add("매출");
    }

    private static final String TAX_TYPE_GROUP = "PURCHASE_TAX_TYPE";
    private static final String CURRENCY_GROUP = "CURRENCY";
    private static final String ORDER_TYPE_GROUP = "PURCHASE_ORDER_TYPE";

    private final ItemPartnerPriceDAO dao;
    private final SystemPolicyService systemPolicyService;

    public ItemPartnerPriceServiceImpl(ItemPartnerPriceDAO dao, SystemPolicyService systemPolicyService) {
        this.systemPolicyService = systemPolicyService;
        this.dao = dao;
    }

    @Override
    public List<ItemPartnerPriceVO> listPrices(Long tenantId, ItemPartnerPriceSearchCondition condition)
            throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("includeHistory", condition != null && condition.isIncludeHistory());
        if (condition != null) {
            putSearch(params, "keyword", condition.getKeyword());
            if (condition.getCustomerId() != null) {
                if (condition.getCustomerId() <= 0) throw new IllegalArgumentException("올바른 거래처 ID가 필요합니다.");
                params.put("customerId", condition.getCustomerId());
            }
            if (condition.getMaterialId() != null) {
                if (condition.getMaterialId() <= 0) throw new IllegalArgumentException("올바른 품목 ID가 필요합니다.");
                params.put("materialId", condition.getMaterialId());
            }
            params.put("itemTypes", ItemTypeFilters.parse(condition.getItemTypes()));
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

        SalesDecimalPolicy decimalPolicy = decimalPolicy(tenantId);
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
            validateImportValues(row, result, decimalPolicy);
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
                if (!safeText(row.getCustomerCode()).isEmpty()) {
                    addError(result, "CUSTOMER_NOT_FOUND", "엑셀 " + row.getSourceRowNumber()
                            + "행의 거래처코드가 현재 테넌트의 사용 가능한 거래처에 없습니다.");
                }
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
        Map<Long, Long> fileDefaults = new HashMap<Long, Long>();
        for (int i = 0; i < rows.size(); i++) {
            ItemPartnerPriceImportRowResultVO result = results.get(i);
            boolean markDefault = "Y".equals(safeText(rows.get(i).getDefaultSupplier()));
            result.setDefaultSupplier(markDefault);
            if (markDefault && result.getMaterialId() != null && result.getCustomerId() != null) {
                Long other = fileDefaults.put(result.getMaterialId(), result.getCustomerId());
                if (other != null && !other.equals(result.getCustomerId())) {
                    addError(result, "DUPLICATE_DEFAULT_SUPPLIER", "엑셀 " + rows.get(i).getSourceRowNumber()
                            + "행의 품목에 서로 다른 거래처가 기본 거래처로 지정되었습니다.");
                }
            }
        }
        validateImportCodes(tenantId, rows, results);
        ItemPartnerPriceImportValidationVO validation = new ItemPartnerPriceImportValidationVO();
        validation.setRows(results);
        return validation;
    }

    private void validateImportCodes(Long tenantId, List<ItemPartnerPriceImportRowVO> rows,
            List<ItemPartnerPriceImportRowResultVO> results) throws Exception {
        Map<String, Boolean> known = new HashMap<String, Boolean>();
        Map<String, String> orderTypes = new HashMap<String, String>();
        for (int i = 0; i < rows.size(); i++) {
            ItemPartnerPriceImportRowVO row = rows.get(i);
            String importOrderType = safeText(row.getOrderType());
            if (!importOrderType.isEmpty() && importOrderType.length() <= 50) {
                String orderTypeCode = resolveOrderTypeCode(tenantId, importOrderType, orderTypes);
                if (orderTypeCode == null) {
                    addError(results.get(i), "INVALID_ORDER_TYPE", "엑셀 " + row.getSourceRowNumber()
                            + "행의 발주구분이 공통코드에 없습니다.");
                } else {
                    results.get(i).setOrderType(orderTypeCode);
                }
            }
            String taxType = safeText(row.getTaxType());
            if (!taxType.isEmpty() && !commonCodeExists(tenantId, TAX_TYPE_GROUP, taxType, known)) {
                addError(results.get(i), "INVALID_TAX_TYPE", "엑셀 " + row.getSourceRowNumber()
                        + "행의 부가세구분이 공통코드에 없습니다.");
            }
            String currency = safeText(row.getCurrency());
            if (!currency.isEmpty() && currency.length() <= 10
                    && !commonCodeExists(tenantId, CURRENCY_GROUP, currency, known)) {
                addError(results.get(i), "INVALID_CURRENCY", "엑셀 " + row.getSourceRowNumber()
                        + "행의 통화가 공통코드에 없습니다.");
            }
        }
    }

    /** 발주구분 입력(코드 또는 이름)을 사용 중 공통코드 코드로 바꾼다. 없으면 null. */
    private String resolveOrderTypeCode(Long tenantId, String text, Map<String, String> cache) throws Exception {
        if (cache.containsKey(text)) return cache.get(text);
        Map<String, Object> params = tenantParams(tenantId);
        params.put("text", text);
        String code = dao.selectOrderTypeCode(params);
        cache.put(text, code);
        return code;
    }

    private boolean commonCodeExists(Long tenantId, String groupCode, String code, Map<String, Boolean> known)
            throws Exception {
        String key = groupCode + "|" + code;
        Boolean cached = known.get(key);
        if (cached == null) {
            Map<String, Object> params = tenantParams(tenantId);
            params.put("groupCode", groupCode);
            params.put("code", code);
            cached = Boolean.TRUE.equals(dao.existsCommonCode(params));
            known.put(key, cached);
        }
        return cached;
    }

    private void validateImportValues(ItemPartnerPriceImportRowVO row, ItemPartnerPriceImportRowResultVO result,
            SalesDecimalPolicy decimalPolicy) {
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
        boolean hasUnitPrice = !safeText(row.getUnitPrice()).isEmpty();
        boolean hasForeignPrice = !safeText(row.getForeignUnitPrice()).isEmpty();
        if (!hasUnitPrice && !hasForeignPrice) {
            addError(result, "INVALID_UNIT_PRICE", "엑셀 " + sourceRow + "행의 원화단가 또는 외화단가를 입력해 주세요.");
        } else if (hasUnitPrice && !validAmount(row.getUnitPrice(), false, "unitPrice", decimalPolicy)) {
            addError(result, "INVALID_UNIT_PRICE", "엑셀 " + sourceRow + "행의 원화단가는 0 이상, 소수 " + decimalPolicy.places("unitPrice") + "자리까지 입력해 주세요.");
        }
        String currency = safeText(row.getCurrency());
        if (currency.length() > 10) {
            addError(result, "INVALID_CURRENCY", "엑셀 " + sourceRow + "행의 통화는 10자 이하여야 합니다.");
        }
        if (!validAmount(row.getForeignUnitPrice(), true, "foreignUnitPrice", decimalPolicy)) {
            addError(result, "INVALID_FOREIGN_UNIT_PRICE",
                    "엑셀 " + sourceRow + "행의 외화단가는 0 이상, 소수 " + decimalPolicy.places("foreignUnitPrice") + "자리까지 입력해 주세요.");
        } else if (!safeText(row.getForeignUnitPrice()).isEmpty() && currency.isEmpty()) {
            addError(result, "INVALID_CURRENCY", "엑셀 " + sourceRow + "행의 외화단가에는 통화가 필요합니다.");
        }
        String vatIncluded = safeText(row.getVatIncludedAt());
        if (!vatIncluded.isEmpty() && !"Y".equals(vatIncluded) && !"N".equals(vatIncluded)) {
            addError(result, "INVALID_VAT_INCLUDED_AT", "엑셀 " + sourceRow + "행의 부가세포함은 Y 또는 N이어야 합니다.");
        } else if ("Y".equals(vatIncluded) && !safeText(row.getTaxType()).isEmpty()
                && !"TAXABLE".equals(safeText(row.getTaxType()))) {
            addError(result, "INVALID_VAT_INCLUDED_AT", "엑셀 " + sourceRow + "행의 부가세 포함은 과세일 때만 선택할 수 있습니다.");
        }
        if (!validDate(safeText(row.getStartDt()))) {
            addError(result, "INVALID_START_DATE", "엑셀 " + sourceRow + "행의 적용 시작일은 YYYY-MM-DD 형식이어야 합니다.");
        }
        String endDt = safeText(row.getEndDt());
        if (!endDt.isEmpty() && (!validDate(endDt)
                || validDate(safeText(row.getStartDt())) && dateBefore(endDt, row.getStartDt()))) {
            addError(result, "INVALID_END_DATE", "엑셀 " + sourceRow + "행의 적용 종료일은 시작일 이후의 YYYY-MM-DD여야 합니다.");
        }
        if (!validAmount(row.getMoq(), true, "moq", decimalPolicy)) {
            addError(result, "INVALID_MOQ", "엑셀 " + sourceRow + "행의 최소주문수량은 0 이상, 소수 " + decimalPolicy.places("moq") + "자리까지 입력해 주세요.");
        }
        String importOrderType = safeText(row.getOrderType());
        if (importOrderType.length() > 50) {
            addError(result, "INVALID_ORDER_TYPE", "엑셀 " + sourceRow + "행의 발주구분이 올바르지 않습니다.");
        } else if (!importOrderType.isEmpty() && !"매입".equals(tradeType)) {
            addError(result, "ORDER_TYPE_NOT_PURCHASE", "엑셀 " + sourceRow + "행의 발주구분은 매입 단가에만 입력할 수 있습니다.");
        }
        String importDefault = safeText(row.getDefaultSupplier());
        if (!importDefault.isEmpty() && !"Y".equals(importDefault) && !"N".equals(importDefault)) {
            addError(result, "INVALID_DEFAULT_SUPPLIER", "엑셀 " + sourceRow + "행의 기본거래처는 Y 또는 N이어야 합니다.");
        } else if ("Y".equals(importDefault)
                && (safeText(row.getCustomerCode()).isEmpty() || !"매입".equals(tradeType))) {
            addError(result, "INVALID_DEFAULT_SUPPLIER",
                    "엑셀 " + sourceRow + "행의 기본 거래처는 거래처가 있는 매입 단가에만 지정할 수 있습니다.");
        }
        String useAtValue = safeText(row.getUseAt());
        if (!useAtValue.isEmpty() && !"Y".equals(useAtValue) && !"N".equals(useAtValue)) {
            addError(result, "INVALID_USE_AT", "엑셀 " + sourceRow + "행의 사용여부는 Y 또는 N이어야 합니다.");
        }
    }

    /** 0 이상 숫자이며 정책의 컬럼 소수 자릿수와 허용 범위를 지키는지 확인한다. */
    private boolean validAmount(String raw, boolean optional, String field, SalesDecimalPolicy decimalPolicy) {
        String value = safeText(raw);
        if (value.isEmpty()) return optional;
        if (!value.matches("[0-9]+(\\.[0-9]+)?")) return false;
        try {
            decimalPolicy.input(field, new BigDecimal(value), field);
            return true;
        } catch (ResponseStatusException | NumberFormatException ex) {
            return false;
        }
    }

    private SalesDecimalPolicy decimalPolicy(Long tenantId) throws Exception {
        return SalesDecimalPolicy.forModule("COMMON", systemPolicyService.getGridDecimals(tenantId),
                DecimalColumnContract.forDocument("co.itemPartnerPrice"));
    }

    /** 0 이상 값을 정책 자릿수로 검증해 저장값으로 돌려준다. */
    private BigDecimal policyAmount(SalesDecimalPolicy decimalPolicy, String field, String label, BigDecimal value) {
        BigDecimal result = decimalPolicy.input(field, value, label);
        if (result.signum() < 0) throw new IllegalArgumentException(label + "은 0 이상이어야 합니다.");
        return result;
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
        requireActiveMaterial(params);
        requireActiveCustomer(params);
        requireKnownCodes(tenantId, payload, params);
        ensureUniqueKey(params, null);
        ensurePeriodAndClosePrevious(params, null);
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
        requireEditable(existing, params);
        // 기본 거래처 표시만 바뀐 저장은 단가 행(수정자·수정일시)을 건드리지 않는다.
        if (sameValues(existing, params)) return existing;
        if (!existing.getMaterialId().equals(params.get("materialId"))) requireActiveMaterial(params);
        if (!params.get("customerId").equals(existing.getCustomerId())) {
            requireActiveCustomer(params);
        }
        requireKnownCodes(tenantId, payload, params);
        ensureUniqueKey(params, priceId);
        ensurePeriodAndClosePrevious(params, priceId);
        try {
            if (dao.updateItemPartnerPrice(params) == 0) throw notFound();
            return findById(tenantId, priceId);
        } catch (DuplicateKeyException ex) {
            throw duplicateKey();
        }
    }

    private boolean sameValues(ItemPartnerPriceVO existing, Map<String, Object> params) {
        return existing.getMaterialId().equals(params.get("materialId"))
                && Objects.equals(existing.getCustomerId(), params.get("customerId"))
                && existing.getTradeType().equals(params.get("tradeType"))
                && sameDecimal(existing.getUnitPrice(), (BigDecimal) params.get("unitPrice"))
                && Objects.equals(existing.getCurrency(), params.get("currency"))
                && Objects.equals(existing.getTaxType(), params.get("taxType"))
                && Objects.equals(existing.getVatIncludedAt(), params.get("vatIncludedAt"))
                && sameDecimal(existing.getForeignUnitPrice(), (BigDecimal) params.get("foreignUnitPrice"))
                && Objects.equals(existing.getOrderType(), params.get("orderType"))
                && Objects.equals(existing.getStartDt(), params.get("startDt"))
                && Objects.equals(StringUtils.hasText(existing.getEndDt()) ? existing.getEndDt() : null,
                        params.get("endDt"))
                && sameDecimal(existing.getMoq(), (BigDecimal) params.get("moq"))
                && Objects.equals(existing.getUseAt(), params.get("useAt"));
    }

    private boolean sameDecimal(BigDecimal left, BigDecimal right) {
        if (left == null || right == null) return left == null && right == null;
        return left.compareTo(right) == 0;
    }

    /** 종료된 과거 단가는 수정할 수 없고, 적용 중인 단가는 기간·품목·거래처·거래구분을 바꿀 수 없다(서버 날짜 기준). */
    private void requireEditable(ItemPartnerPriceVO existing, Map<String, Object> params) {
        LocalDate today = LocalDate.now();
        LocalDate start = LocalDate.parse(existing.getStartDt());
        LocalDate end = StringUtils.hasText(existing.getEndDt()) ? LocalDate.parse(existing.getEndDt()) : null;
        if (end != null && end.isBefore(today)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "종료된 과거 단가는 수정할 수 없습니다. 새 적용일로 단가를 추가해 주세요.");
        }
        if (!start.isAfter(today)) {
            boolean sameKey = existing.getStartDt().equals(params.get("startDt"))
                    && existing.getMaterialId().equals(params.get("materialId"))
                    && Objects.equals(existing.getCustomerId(), params.get("customerId"))
                    && existing.getTradeType().equals(params.get("tradeType"));
            if (!sameKey) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "적용 중인 단가는 적용 시작일·품목·거래처·거래구분을 바꿀 수 없습니다. 새 적용일로 단가를 추가해 주세요.");
            }
        }
    }

    private void requireKnownCodes(Long tenantId, ItemPartnerPriceSaveRequestVO payload,
            Map<String, Object> params) throws Exception {
        Map<String, Boolean> known = new HashMap<String, Boolean>();
        if (StringUtils.hasText(payload.getTaxType())
                && !commonCodeExists(tenantId, TAX_TYPE_GROUP, (String) params.get("taxType"), known)) {
            throw new IllegalArgumentException("부가세구분이 공통코드에 없습니다.");
        }
        if (params.get("orderType") != null
                && !commonCodeExists(tenantId, ORDER_TYPE_GROUP, (String) params.get("orderType"), known)) {
            throw new IllegalArgumentException("사용할 수 없는 발주구분입니다.");
        }
        if (params.get("currency") != null
                && !commonCodeExists(tenantId, CURRENCY_GROUP, (String) params.get("currency"), known)) {
            throw new IllegalArgumentException("통화가 공통코드에 없습니다.");
        }
    }

    /** 기간이 겹치면 막고, 새 행보다 앞서 시작한 종료일 없는 행은 새 적용일 전날로 자동 종료한다. */
    private void ensurePeriodAndClosePrevious(Map<String, Object> params, Long excludePriceId) throws Exception {
        if (!"Y".equals(params.get("useAt"))) return;
        params.put("excludePriceId", excludePriceId);
        if (dao.selectOverlappingPriceId(params) != null) {
            throw new IllegalArgumentException("같은 품목·거래처·거래구분의 다른 단가와 적용 기간이 겹칩니다.");
        }
        dao.closePreviousOpenPrices(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePrice(Long tenantId, String actor, Long priceId) throws Exception {
        if (priceId == null || priceId <= 0) throw new IllegalArgumentException("올바른 단가 ID가 필요합니다.");
        if (!StringUtils.hasText(actor) || actor.trim().length() > 10) {
            throw new IllegalArgumentException("인증 사용자 정보를 확인할 수 없습니다.");
        }
        ItemPartnerPriceVO existing = findById(tenantId, priceId);
        LocalDate end = StringUtils.hasText(existing.getEndDt()) ? LocalDate.parse(existing.getEndDt()) : null;
        if (end != null && end.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "종료된 과거 단가는 삭제할 수 없습니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("priceId", priceId);
        params.put("materialId", existing.getMaterialId());
        params.put("customerId", existing.getCustomerId());
        params.put("tradeType", existing.getTradeType());
        params.put("startDt", existing.getStartDt());
        params.put("endDt", existing.getEndDt());
        params.put("updatedBy", actor.trim());
        // 사용 중인 행만 직전 단가를 자동 종료시켰으므로, 미사용 행을 지울 때는 직전 단가를 건드리지 않는다.
        if (!"N".equals(existing.getUseAt())) {
            Long predecessorId = dao.selectPredecessorPriceId(params);
            if (predecessorId != null) {
                params.put("predecessorId", predecessorId);
                dao.reopenPrice(params);
            }
        }
        if (dao.deleteItemPartnerPrice(params) == 0) throw notFound();
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

    private Map<String, Object> saveParams(Long tenantId, String actor, ItemPartnerPriceSaveRequestVO payload)
            throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        if (payload == null) throw new IllegalArgumentException("단가 저장 요청이 비어 있습니다.");
        if (payload.getMaterialId() == null || payload.getMaterialId() <= 0) {
            throw new IllegalArgumentException("품목을 선택해 주세요.");
        }
        if (payload.getCustomerId() == null || payload.getCustomerId() <= 0) {
            throw new IllegalArgumentException("거래처를 선택해 주세요. 단가는 거래처별로 등록합니다.");
        }
        if (!TRADE_TYPES.contains(safeText(payload.getTradeType()))) {
            throw new IllegalArgumentException("거래구분은 매입 또는 매출이어야 합니다.");
        }
        if (payload.getUnitPrice() == null && payload.getForeignUnitPrice() == null) {
            throw new IllegalArgumentException("원화단가 또는 외화단가를 입력해 주세요.");
        }
        SalesDecimalPolicy decimalPolicy = decimalPolicy(tenantId);
        BigDecimal unitPrice = payload.getUnitPrice() == null ? null
                : policyAmount(decimalPolicy, "unitPrice", "원화단가", payload.getUnitPrice());
        BigDecimal moq = payload.getMoq() == null ? null
                : policyAmount(decimalPolicy, "moq", "최소주문수량", payload.getMoq());
        BigDecimal foreignUnitPrice = payload.getForeignUnitPrice() == null ? null
                : policyAmount(decimalPolicy, "foreignUnitPrice", "외화단가", payload.getForeignUnitPrice());
        String currency = safeText(payload.getCurrency());
        if (currency.length() > 10) throw new IllegalArgumentException("통화는 10자 이하여야 합니다.");
        if (foreignUnitPrice != null && currency.isEmpty()) {
            throw new IllegalArgumentException("외화단가를 입력하면 통화를 선택해 주세요.");
        }
        // 통화는 외화단가의 통화이므로 외화단가가 없으면 저장하지 않는다.
        String storedCurrency = foreignUnitPrice == null ? null : currency;
        String taxType = StringUtils.hasText(payload.getTaxType()) ? payload.getTaxType().trim() : "TAXABLE";
        if (taxType.length() > 30) throw new IllegalArgumentException("부가세구분 코드가 올바르지 않습니다.");
        String vatIncludedAt = StringUtils.hasText(payload.getVatIncludedAt())
                ? payload.getVatIncludedAt().trim() : "N";
        if (!"Y".equals(vatIncludedAt) && !"N".equals(vatIncludedAt)) {
            throw new IllegalArgumentException("부가세포함 여부는 Y 또는 N이어야 합니다.");
        }
        if ("Y".equals(vatIncludedAt) && !"TAXABLE".equals(taxType)) {
            throw new IllegalArgumentException("부가세 포함은 과세일 때만 선택할 수 있습니다.");
        }
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
        String orderType = StringUtils.hasText(payload.getOrderType()) ? payload.getOrderType().trim() : null;
        if (orderType != null) {
            if (orderType.length() > 50) throw new IllegalArgumentException("발주구분 코드가 올바르지 않습니다.");
            if (!"매입".equals(payload.getTradeType().trim())) {
                throw new IllegalArgumentException("발주구분은 매입 단가에만 입력할 수 있습니다.");
            }
        }
        params.put("materialId", payload.getMaterialId());
        params.put("customerId", payload.getCustomerId());
        params.put("tradeType", payload.getTradeType().trim());
        params.put("unitPrice", unitPrice);
        params.put("currency", storedCurrency);
        params.put("taxType", taxType);
        params.put("vatIncludedAt", vatIncludedAt);
        params.put("foreignUnitPrice", foreignUnitPrice);
        params.put("orderType", orderType);
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
