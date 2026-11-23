package egovframework.let.materials.request.confirm.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.co.master.itempartnerprice.domain.model.ItemPriceLookupVO;
import egovframework.let.co.master.itempartnerprice.service.ItemPriceLookupService;
import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmListItemVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseConfirmVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmCandidateVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestConfirmRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseDetailVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseRequestOrderCloseRequestVO;
import egovframework.let.materials.request.confirm.domain.model.PurchaseUnitPriceVO;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.confirm.service.PurchaseRequestConfirmService;

/**
 * 구매요청 품목 행을 골라 묶어 확정번호(MC)를 발급하고, 발주대기 마감과 확정번호 단위 확정 취소를 처리하는 서비스 클래스.
 * 요청 상태(요청/부분확정/확정)는 상세 확정 여부로 다시 계산한다.
 *
 * @author S-ERP
 * @since 2026.11.12
 * @version 1.0
 */
@Service("purchaseRequestConfirmService")
public class PurchaseRequestConfirmServiceImpl extends EgovAbstractServiceImpl
        implements PurchaseRequestConfirmService {

    static final String STATUS_REQUESTED = "REQUESTED";
    static final String DEFAULT_CURRENCY = "KRW";
    static final String DEFAULT_TAX_TYPE = "TAXABLE";
    static final String CONFIRM_NO_GENERATOR_KEY = "MATERIAL_CONFIRM_NO";
    static final int MAX_DETAILS_PER_CONFIRM = 200;
    private static final int CONFIRM_NO_MAX_LENGTH = 30;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;
    private static final Pattern CURRENCY_PATTERN = Pattern.compile("^[A-Z]{3}$");

    private final PurchaseRequestConfirmDAO confirmDAO;
    private final IdSequenceService idSequenceService;
    private final ItemPriceLookupService priceLookupService;

    public PurchaseRequestConfirmServiceImpl(PurchaseRequestConfirmDAO confirmDAO,
            IdSequenceService idSequenceService, ItemPriceLookupService priceLookupService) {
        this.confirmDAO = confirmDAO;
        this.idSequenceService = idSequenceService;
        this.priceLookupService = priceLookupService;
    }

    @Override
    public List<PurchaseRequestConfirmCandidateVO> listCandidates(Long tenantId, String keyword, LocalDate fromDt,
            LocalDate toDt) throws Exception {
        requireTenant(tenantId);
        requireOrderedRange(fromDt, toDt);
        Map<String, Object> params = tenantParams(tenantId);
        params.put("keyword", normalize(keyword));
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        return confirmDAO.selectCandidates(params);
    }

    @Override
    public List<PurchaseRequestConfirmDetailVO> loadRequestDetails(Long tenantId, List<Long> purchaseRequestDetailIds,
            LocalDate baseDt) throws Exception {
        requireTenant(tenantId);
        List<Long> ids = detailIds(purchaseRequestDetailIds);
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", ids);
        requireAllUnconfirmed(confirmDAO.selectDetailLocks(params), ids);
        List<PurchaseRequestConfirmDetailVO> details = confirmDAO.selectDetailsByIds(params);
        applyPurchasePrices(tenantId, details, baseDt == null ? LocalDate.now() : baseDt);
        return details;
    }

    /** 확정되지 않은 행에 품목의 구매처(거래처 1곳이면 그 거래처, 2곳 이상이면 기본 거래처)와 그 거래처의 기준일 단가·부가세·통화·발주구분을 채운다(공통 단가 조회 서비스). */
    private void applyPurchasePrices(Long tenantId, List<PurchaseRequestConfirmDetailVO> details,
            LocalDate baseDt) throws Exception {
        Set<Long> materialIds = new LinkedHashSet<Long>();
        for (PurchaseRequestConfirmDetailVO detail : details) {
            if (detail.getConfirmQty() == null && detail.getMaterialId() != null) {
                materialIds.add(detail.getMaterialId());
            }
        }
        if (materialIds.isEmpty()) {
            return;
        }
        Map<Long, ItemPriceLookupVO> defaults = priceLookupService.findPurchasePrices(tenantId, materialIds,
                baseDt);
        for (PurchaseRequestConfirmDetailVO detail : details) {
            ItemPriceLookupVO found = detail.getConfirmQty() == null ? defaults.get(detail.getMaterialId()) : null;
            if (found == null) {
                continue;
            }
            detail.setSupplierId(found.getSupplierId());
            detail.setSupplierCode(found.getSupplierCode());
            detail.setSupplierName(found.getSupplierName());
            detail.setUnitPrice(found.getUnitPrice());
            detail.setCurrencyCode(found.getCurrency());
            detail.setTaxType(found.getTaxType());
            detail.setVatIncludedAt(found.getVatIncludedAt());
            detail.setForeignUnitPrice(found.getForeignUnitPrice());
            detail.setForeignCurrency(found.getForeignCurrency());
            detail.setOrderType(found.getOrderType());
            detail.setOrderTypeName(found.getOrderTypeName());
        }
    }

    @Override
    public List<PurchaseConfirmListItemVO> listConfirms(Long tenantId, String keyword, String status, LocalDate fromDt,
            LocalDate toDt) throws Exception {
        requireTenant(tenantId);
        requireOrderedRange(fromDt, toDt);
        String normalized = normalize(status);
        normalized = normalized == null ? "ACTIVE" : normalized.toUpperCase(Locale.ROOT);
        Map<String, Object> params = tenantParams(tenantId);
        params.put("keyword", normalize(keyword));
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        if ("ACTIVE".equals(normalized)) {
            params.put("useAt", "Y");
        } else if ("CANCELED".equals(normalized)) {
            params.put("useAt", "N");
        } else if (!"ALL".equals(normalized)) {
            throw badRequest("상태 조건이 올바르지 않습니다.");
        }
        return confirmDAO.selectConfirms(params);
    }

    @Override
    public PurchaseConfirmVO getConfirm(Long tenantId, Long purchaseConfirmId) throws Exception {
        requireTenant(tenantId);
        if (purchaseConfirmId == null || purchaseConfirmId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = confirmParams(tenantId, purchaseConfirmId);
        PurchaseConfirmVO confirm = confirmDAO.selectConfirm(params);
        if (confirm == null) {
            throw notFound();
        }
        confirm.setDetails(confirmDAO.selectDetailsByConfirm(params));
        return confirm;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseConfirmVO createConfirm(Long tenantId, String userId, PurchaseRequestConfirmRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        if (payload == null || payload.getConfirmDt() == null) {
            throw badRequest("확정일을 입력해 주세요.");
        }
        String remark = normalize(payload.getRemark());
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("확정 비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("확정할 구매요청 품목을 선택해 주세요.");
        }
        List<Long> requestedDetailIds = new ArrayList<Long>();
        for (PurchaseRequestConfirmDetailRequestVO detail : payload.getDetails()) {
            if (detail == null) {
                throw badRequest("구매요청 품목 선택이 올바르지 않습니다.");
            }
            requestedDetailIds.add(detail.getPurchaseRequestDetailId());
        }
        List<Long> ids = detailIds(requestedDetailIds);

        Map<String, Object> lockParams = tenantParams(tenantId);
        lockParams.put("detailIds", ids);
        List<PurchaseRequestDetailLockVO> locked = confirmDAO.selectDetailLocksForUpdate(lockParams);
        requireAllUnconfirmed(locked, ids);
        Set<Long> requestIdSet = new TreeSet<Long>();
        for (PurchaseRequestDetailLockVO lockRow : locked) {
            requestIdSet.add(lockRow.getPurchaseRequestId());
        }

        List<Map<String, Object>> prepared = new ArrayList<Map<String, Object>>();
        Set<String> currencies = new TreeSet<String>();
        for (PurchaseRequestConfirmDetailRequestVO detail : payload.getDetails()) {
            Map<String, Object> values = prepareDetail(tenantId, detail);
            values.put("purchaseRequestDetailId", detail.getPurchaseRequestDetailId());
            currencies.add((String) values.get("currencyCode"));
            prepared.add(values);
        }
        if (currencies.size() > 1) {
            throw badRequest("통화가 다른 품목은 함께 확정할 수 없습니다. 같은 통화 품목끼리 확정해 주세요.");
        }

        Long confirmerId = confirmDAO.selectUserId(userParams(tenantId, userId));
        if (confirmerId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "확정자 사용자 정보를 찾을 수 없습니다.");
        }

        BigDecimal totalAmt = BigDecimal.ZERO.setScale(SCALE);
        for (Map<String, Object> values : prepared) {
            totalAmt = totalAmt.add((BigDecimal) values.get("amount"));
        }
        if (totalAmt.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("합계금액이 허용 범위를 초과했습니다.");
        }

        Map<String, Object> header = tenantParams(tenantId);
        header.put("confirmNo", generateConfirmNo(tenantId, payload.getConfirmDt()));
        header.put("confirmDt", payload.getConfirmDt());
        header.put("confirmerId", confirmerId);
        header.put("currencyCode", currencies.iterator().next());
        header.put("totalAmt", totalAmt);
        header.put("remark", remark);
        header.put("createdBy", userId);
        Long purchaseConfirmId = confirmDAO.insertConfirmHeader(header);
        if (purchaseConfirmId == null || purchaseConfirmId < 1L) {
            throw new IllegalStateException("구매요청확정 저장에 실패했습니다.");
        }

        for (Map<String, Object> values : prepared) {
            values.put("tenantId", tenantId);
            values.put("purchaseConfirmId", purchaseConfirmId);
            values.put("updatedBy", userId);
            if (confirmDAO.updateDetailConfirm(values) != 1) {
                throw itemsChanged();
            }
        }
        refreshRequests(tenantId, userId, new ArrayList<Long>(requestIdSet));
        return getConfirm(tenantId, purchaseConfirmId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseConfirmVO saveOrderClose(Long tenantId, String userId, Long purchaseConfirmId,
            PurchaseRequestOrderCloseRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        if (payload == null || payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("발주대기 마감을 변경할 상세 행이 없습니다.");
        }
        lockActiveConfirm(tenantId, purchaseConfirmId);
        Map<String, Object> params = confirmParams(tenantId, purchaseConfirmId);
        Set<Long> storedIds = new HashSet<Long>();
        for (PurchaseRequestConfirmDetailVO detail : confirmDAO.selectDetailsByConfirm(params)) {
            storedIds.add(detail.getPurchaseRequestDetailId());
        }
        Set<Long> seen = new HashSet<Long>();
        for (PurchaseRequestOrderCloseDetailVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseRequestDetailId() == null
                    || !storedIds.contains(detail.getPurchaseRequestDetailId())
                    || !seen.add(detail.getPurchaseRequestDetailId())) {
                throw badRequest("구매요청 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
            String closeAt = normalize(detail.getOrderCloseAt());
            if (!"Y".equals(closeAt) && !"N".equals(closeAt)) {
                throw badRequest("발주대기 마감 값은 Y 또는 N이어야 합니다.");
            }
        }
        for (PurchaseRequestOrderCloseDetailVO detail : payload.getDetails()) {
            Map<String, Object> values = tenantParams(tenantId);
            values.put("purchaseConfirmId", purchaseConfirmId);
            values.put("purchaseRequestDetailId", detail.getPurchaseRequestDetailId());
            values.put("orderCloseAt", detail.getOrderCloseAt().trim());
            values.put("updatedBy", userId);
            confirmDAO.updateDetailOrderClose(values);
        }
        return getConfirm(tenantId, purchaseConfirmId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseConfirmVO cancelConfirm(Long tenantId, String userId, Long purchaseConfirmId) throws Exception {
        requirePrincipal(tenantId, userId);
        lockActiveConfirm(tenantId, purchaseConfirmId);
        Map<String, Object> params = confirmParams(tenantId, purchaseConfirmId);
        if (confirmDAO.existsActiveOrderByConfirm(params)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "이미 발주된 확정은 취소할 수 없습니다. 발주를 먼저 취소해 주세요.");
        }
        params.put("updatedBy", userId);
        List<Long> requestIds = confirmDAO.selectRequestIdsByConfirm(params);
        confirmDAO.clearDetailsByConfirm(params);
        refreshRequests(tenantId, userId, requestIds);
        if (confirmDAO.cancelConfirmHeader(params) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 확정입니다.");
        }
        return getConfirm(tenantId, purchaseConfirmId);
    }

    @Override
    public PurchaseUnitPriceVO findDefaultUnitPrice(Long tenantId, Long materialId, Long supplierId,
            LocalDate baseDt) throws Exception {
        requireTenant(tenantId);
        if (materialId == null || materialId < 1L || supplierId == null || supplierId < 1L || baseDt == null) {
            throw badRequest("품목, 구매처, 기준일을 입력해 주세요.");
        }
        ItemPriceLookupVO found = priceLookupService.findPrice(tenantId, "매입", materialId, supplierId, baseDt);
        if (found == null) {
            return null;
        }
        PurchaseUnitPriceVO price = new PurchaseUnitPriceVO();
        price.setUnitPrice(found.getUnitPrice());
        price.setCurrency(found.getCurrency());
        price.setTaxType(found.getTaxType());
        price.setVatIncludedAt(found.getVatIncludedAt());
        price.setForeignUnitPrice(found.getForeignUnitPrice());
        price.setForeignCurrency(found.getForeignCurrency());
        price.setOrderType(found.getOrderType());
        return price;
    }

    private Map<String, Object> prepareDetail(Long tenantId, PurchaseRequestConfirmDetailRequestVO detail)
            throws Exception {
        if (detail.getConfirmQty() == null || detail.getConfirmQty().signum() <= 0) {
            throw badRequest("확정수량은 0보다 커야 합니다.");
        }
        BigDecimal confirmQty = decimal(detail.getConfirmQty(), "확정수량");
        if (detail.getConfirmDeliveryDt() == null) {
            throw badRequest("확정납기일을 입력해 주세요.");
        }
        if (detail.getWarehouseId() == null) {
            throw badRequest("입고창고를 선택해 주세요.");
        }
        String orderType = normalize(detail.getOrderType());
        if (orderType == null) {
            throw badRequest("발주구분을 선택해 주세요.");
        }
        if (detail.getSupplierId() == null) {
            throw badRequest("구매처를 선택해 주세요.");
        }
        BigDecimal unitPrice = null;
        if (detail.getUnitPrice() != null) {
            if (detail.getUnitPrice().signum() < 0) {
                throw badRequest("단가는 0 이상이어야 합니다.");
            }
            unitPrice = decimal(detail.getUnitPrice(), "단가");
        }
        String currencyCode = normalize(detail.getCurrencyCode());
        if (currencyCode == null) {
            currencyCode = DEFAULT_CURRENCY;
        } else if (!CURRENCY_PATTERN.matcher(currencyCode).matches()) {
            throw badRequest("통화 코드가 올바르지 않습니다.");
        }
        String taxType = normalize(detail.getTaxType());
        if (taxType == null) {
            taxType = DEFAULT_TAX_TYPE;
        }
        String vatIncludedAt = normalize(detail.getVatIncludedAt());
        if (vatIncludedAt == null) {
            vatIncludedAt = "N";
        } else if (!"Y".equals(vatIncludedAt) && !"N".equals(vatIncludedAt)) {
            throw badRequest("부가세 포함 여부는 Y 또는 N이어야 합니다.");
        }
        if ("Y".equals(vatIncludedAt) && !DEFAULT_TAX_TYPE.equals(taxType)) {
            throw badRequest("부가세 포함은 과세일 때만 선택할 수 있습니다.");
        }
        String confirmRemark = normalize(detail.getConfirmRemark());
        if (confirmRemark != null && confirmRemark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("확정비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        if (!confirmDAO.existsWarehouse(referenceParams(tenantId, "id", detail.getWarehouseId()))) {
            throw badRequest("사용할 수 없는 입고창고입니다.");
        }
        if (!confirmDAO.existsOrderType(referenceParams(tenantId, "code", orderType))) {
            throw badRequest("사용할 수 없는 발주구분입니다.");
        }
        if (!confirmDAO.existsTaxType(referenceParams(tenantId, "code", taxType))) {
            throw badRequest("사용할 수 없는 부가세구분입니다.");
        }
        if (!confirmDAO.existsSupplier(referenceParams(tenantId, "id", detail.getSupplierId()))) {
            throw badRequest("사용할 수 없는 구매처입니다.");
        }
        BigDecimal amount = unitPrice == null
                ? BigDecimal.ZERO.setScale(SCALE)
                : confirmQty.multiply(unitPrice).setScale(SCALE, RoundingMode.HALF_UP);
        if (amount.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("금액이 허용 범위를 초과했습니다.");
        }

        Map<String, Object> values = new HashMap<String, Object>();
        values.put("confirmQty", confirmQty);
        values.put("confirmDeliveryDt", detail.getConfirmDeliveryDt());
        values.put("warehouseId", detail.getWarehouseId());
        values.put("orderType", orderType);
        values.put("supplierId", detail.getSupplierId());
        values.put("unitPrice", unitPrice);
        values.put("currencyCode", currencyCode);
        values.put("taxType", taxType);
        values.put("vatIncludedAt", vatIncludedAt);
        values.put("amount", amount);
        values.put("confirmRemark", confirmRemark);
        return values;
    }

    /** 1~200건, 중복 없는 상세 행 ID 목록을 오름차순으로 돌려준다(잠금 순서 고정). */
    private List<Long> detailIds(List<Long> purchaseRequestDetailIds) {
        if (purchaseRequestDetailIds == null || purchaseRequestDetailIds.isEmpty()) {
            throw badRequest("확정할 구매요청 품목을 선택해 주세요.");
        }
        Set<Long> unique = new TreeSet<Long>();
        for (Long id : purchaseRequestDetailIds) {
            if (id == null || id < 1L || !unique.add(id)) {
                throw badRequest("구매요청 품목 선택이 올바르지 않습니다.");
            }
        }
        if (unique.size() > MAX_DETAILS_PER_CONFIRM) {
            throw badRequest("한 번에 확정할 수 있는 품목은 " + MAX_DETAILS_PER_CONFIRM + "행까지입니다.");
        }
        return Collections.unmodifiableList(new ArrayList<Long>(unique));
    }

    /** 고른 행이 모두 있고(삭제된 요청 제외) 아직 확정되지 않았는지 확인한다. */
    private void requireAllUnconfirmed(List<PurchaseRequestDetailLockVO> locked, List<Long> ids) {
        if (locked == null || locked.size() != ids.size()) {
            throw itemsChanged();
        }
        for (PurchaseRequestDetailLockVO row : locked) {
            if (row.getPurchaseConfirmId() != null) {
                throw itemsChanged();
            }
        }
    }

    private void refreshRequests(Long tenantId, String userId, List<Long> requestIds) throws Exception {
        if (requestIds == null || requestIds.isEmpty()) {
            return;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseRequestIds", requestIds);
        params.put("updatedBy", userId);
        confirmDAO.refreshRequestStatuses(params);
    }

    private void lockActiveConfirm(Long tenantId, Long purchaseConfirmId) throws Exception {
        if (purchaseConfirmId == null || purchaseConfirmId < 1L) {
            throw notFound();
        }
        String useAt = confirmDAO.selectConfirmUseAtForUpdate(confirmParams(tenantId, purchaseConfirmId));
        if (useAt == null) {
            throw notFound();
        }
        if (!"Y".equals(useAt)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 확정입니다.");
        }
    }

    private String generateConfirmNo(Long tenantId, LocalDate confirmDt) throws Exception {
        String dateKey = confirmDt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(CONFIRM_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("구매요청확정번호를 생성할 수 없습니다.");
        }
        String confirmNo = String.format(Locale.ROOT, "MC-%s-%04d", dateKey, sequence);
        if (confirmNo.length() > CONFIRM_NO_MAX_LENGTH) {
            throw new IllegalStateException("구매요청확정번호를 생성할 수 없습니다.");
        }
        return confirmNo;
    }

    private BigDecimal decimal(BigDecimal value, String label) {
        BigDecimal normalized;
        try {
            normalized = value.setScale(SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest(label + "은(는) 소수 둘째 자리까지 입력할 수 있습니다.");
        }
        if (normalized.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest(label + "이(가) 허용 범위를 초과했습니다.");
        }
        return normalized;
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null || tenantId < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void requirePrincipal(Long tenantId, String userId) {
        requireTenant(tenantId);
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        return params;
    }

    private Map<String, Object> confirmParams(Long tenantId, Long purchaseConfirmId) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseConfirmId", purchaseConfirmId);
        return params;
    }

    private Map<String, Object> userParams(Long tenantId, String userId) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("loginCode", userId);
        return params;
    }

    private Map<String, Object> referenceParams(Long tenantId, String key, Object value) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put(key, value);
        return params;
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "구매요청확정을 찾을 수 없습니다.");
    }

    private ResponseStatusException itemsChanged() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "이미 확정되었거나 삭제된 구매요청 품목이 있습니다. 다시 불러와 주세요.");
    }

    /** 시작일이 종료일보다 늦으면 400. 한쪽만 있거나 둘 다 없으면 허용한다. */
    private void requireOrderedRange(LocalDate fromDt, LocalDate toDt) {
        if (fromDt != null && toDt != null && fromDt.isAfter(toDt)) {
            throw badRequest("시작일이 종료일보다 늦습니다.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
