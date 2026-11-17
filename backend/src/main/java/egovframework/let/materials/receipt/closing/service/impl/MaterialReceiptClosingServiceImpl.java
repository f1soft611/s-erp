package egovframework.let.materials.receipt.closing.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.materials.order.create.service.impl.PurchaseOrderAmountCalculator;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingReleaseRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRequestVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingRowVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSearchVO;
import egovframework.let.materials.receipt.closing.domain.model.MaterialReceiptClosingSupplierVO;
import egovframework.let.materials.receipt.closing.domain.repository.MaterialReceiptClosingDAO;
import egovframework.let.materials.receipt.closing.service.MaterialReceiptClosingService;

/**
 * 입고 행 매입마감 서비스 구현 클래스.
 * 마감 금액은 서버가 입고수량·마감 단가·세금 구분으로 계산하며, 입고 행의 원래 단가·금액은 바꾸지 않는다.
 * 마감·해제는 대상 입고 헤더와 상세를 잠근 뒤 상태를 다시 확인하고 처리한다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Service("materialReceiptClosingService")
public class MaterialReceiptClosingServiceImpl extends EgovAbstractServiceImpl
        implements MaterialReceiptClosingService {

    private static final int MAX_ROWS = 500;
    private static final Pattern MONTH = Pattern.compile("^[0-9]{4}(0[1-9]|1[0-2])$");
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999999.99");

    private static final String ALL = "ALL";
    private static final String OPEN = "OPEN";
    private static final String CLOSED = "CLOSED";

    private final MaterialReceiptClosingDAO closingDAO;

    public MaterialReceiptClosingServiceImpl(MaterialReceiptClosingDAO closingDAO) {
        this.closingDAO = closingDAO;
    }

    @Override
    public List<MaterialReceiptClosingSupplierVO> listSuppliers(Long tenantId, MaterialReceiptClosingSearchVO search)
            throws Exception {
        requireTenant(tenantId);
        Map<String, Object> params = baseParams(tenantId, search, true);
        return closingDAO.selectSuppliers(params);
    }

    @Override
    public List<MaterialReceiptClosingRowVO> listRows(Long tenantId, MaterialReceiptClosingSearchVO search)
            throws Exception {
        requireTenant(tenantId);
        MaterialReceiptClosingSearchVO condition = search == null ? new MaterialReceiptClosingSearchVO() : search;
        String closeType = text(condition.getCloseType());
        closeType = closeType == null ? ALL : closeType;
        if (!ALL.equals(closeType) && !OPEN.equals(closeType) && !CLOSED.equals(closeType)) {
            throw badRequest("조회구분이 올바르지 않습니다.");
        }
        // 마감 행 조회는 마감월 기준이라 입고일 기간이 필요 없다.
        Map<String, Object> params = baseParams(tenantId, condition, !CLOSED.equals(closeType));
        params.put("closeType", closeType);
        params.put("supplierId", condition.getSupplierId());
        params.put("orderNo", text(condition.getOrderNo()));
        return closingDAO.selectRows(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int close(Long tenantId, String userId, MaterialReceiptClosingRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        if (payload == null) {
            throw badRequest("마감할 행을 선택해 주세요.");
        }
        String closingMonth = month(payload.getClosingMonth());
        if (payload.getRows() == null || payload.getRows().isEmpty()) {
            throw badRequest("마감할 행을 선택해 주세요.");
        }
        if (payload.getRows().size() > MAX_ROWS) {
            throw badRequest("한 번에 마감할 수 있는 행은 " + MAX_ROWS + "건까지입니다.");
        }
        Map<Long, MaterialReceiptClosingRequestVO.Row> requested =
                new TreeMap<Long, MaterialReceiptClosingRequestVO.Row>();
        for (MaterialReceiptClosingRequestVO.Row row : payload.getRows()) {
            if (row == null || row.getReceiptDetailId() == null || row.getReceiptDetailId() < 1L) {
                throw badRequest("마감할 입고 행 정보가 올바르지 않습니다.");
            }
            if (requested.put(row.getReceiptDetailId(), row) != null) {
                throw badRequest("같은 입고 행이 중복되었습니다.");
            }
            validateRow(row);
        }

        Map<Long, MaterialReceiptClosingRowVO> locked = lockRows(tenantId, requested.keySet());
        for (Long id : requested.keySet()) {
            MaterialReceiptClosingRowVO current = locked.get(id);
            if (current == null) {
                throw conflict("마감할 입고 행이 변경되었습니다. 화면을 다시 조회해 주세요.");
            }
            if (!"Y".equals(current.getUseAt())) {
                throw conflict("취소된 입고는 마감할 수 없습니다. 입고 " + current.getReceiptNo());
            }
            if (current.getClosingMonth() != null) {
                throw conflict("이미 마감된 행입니다. 입고 " + current.getReceiptNo() + " (마감월 "
                        + current.getClosingMonth() + ")");
            }
        }

        int count = 0;
        for (Map.Entry<Long, MaterialReceiptClosingRequestVO.Row> entry : requested.entrySet()) {
            MaterialReceiptClosingRowVO current = locked.get(entry.getKey());
            MaterialReceiptClosingRequestVO.Row row = entry.getValue();
            BigDecimal unitPrice = row.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
            String taxType = row.getTaxType().trim();
            boolean vatIncluded = "Y".equals(vatIncludedAt(row));
            PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                    current.getReceiptQty(), unitPrice, taxType, vatIncluded, null);
            if (amounts.getTotalAmt().compareTo(MAX_AMOUNT) > 0) {
                throw badRequest("금액이 너무 큽니다. 입고 " + current.getReceiptNo());
            }
            Map<String, Object> params = tenantParams(tenantId);
            params.put("materialReceiptDetailId", entry.getKey());
            params.put("closingMonth", closingMonth);
            params.put("closedBy", userId);
            params.put("unitPrice", unitPrice);
            params.put("taxType", taxType);
            params.put("vatIncludedAt", vatIncluded ? "Y" : "N");
            params.put("supplyAmt", amounts.getSupplyAmt());
            params.put("vatAmt", amounts.getVatAmt());
            params.put("totalAmt", amounts.getTotalAmt());
            if (closingDAO.closeRow(params) != 1) {
                throw conflict("마감할 입고 행이 변경되었습니다. 화면을 다시 조회해 주세요.");
            }
            count++;
        }
        return count;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int release(Long tenantId, String userId, MaterialReceiptClosingReleaseRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        if (payload == null || payload.getReceiptDetailIds() == null || payload.getReceiptDetailIds().isEmpty()) {
            throw badRequest("해제할 행을 선택해 주세요.");
        }
        if (payload.getReceiptDetailIds().size() > MAX_ROWS) {
            throw badRequest("한 번에 해제할 수 있는 행은 " + MAX_ROWS + "건까지입니다.");
        }
        Set<Long> ids = new TreeSet<Long>();
        for (Long id : payload.getReceiptDetailIds()) {
            if (id == null || id < 1L) {
                throw badRequest("해제할 입고 행 정보가 올바르지 않습니다.");
            }
            if (!ids.add(id)) {
                throw badRequest("같은 입고 행이 중복되었습니다.");
            }
        }
        Map<Long, MaterialReceiptClosingRowVO> locked = lockRows(tenantId, ids);
        for (Long id : ids) {
            MaterialReceiptClosingRowVO current = locked.get(id);
            if (current == null) {
                throw conflict("해제할 입고 행이 변경되었습니다. 화면을 다시 조회해 주세요.");
            }
            if (current.getClosingMonth() == null) {
                throw conflict("마감되지 않은 행입니다. 입고 " + current.getReceiptNo());
            }
        }
        int count = 0;
        for (Long id : ids) {
            Map<String, Object> params = tenantParams(tenantId);
            params.put("materialReceiptDetailId", id);
            params.put("updatedBy", userId);
            if (closingDAO.releaseRow(params) != 1) {
                throw conflict("해제할 입고 행이 변경되었습니다. 화면을 다시 조회해 주세요.");
            }
            count++;
        }
        return count;
    }

    private Map<Long, MaterialReceiptClosingRowVO> lockRows(Long tenantId, Set<Long> ids) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(ids));
        Map<Long, MaterialReceiptClosingRowVO> byId = new LinkedHashMap<Long, MaterialReceiptClosingRowVO>();
        for (MaterialReceiptClosingRowVO row : closingDAO.selectRowsForUpdate(params)) {
            byId.put(row.getMaterialReceiptDetailId(), row);
        }
        return byId;
    }

    private void validateRow(MaterialReceiptClosingRequestVO.Row row) {
        if (row.getUnitPrice() == null || row.getUnitPrice().signum() < 0) {
            throw badRequest("마감 단가는 0 이상이어야 합니다.");
        }
        String taxType = text(row.getTaxType());
        if (!PurchaseOrderAmountCalculator.TAXABLE.equals(taxType)
                && !PurchaseOrderAmountCalculator.ZERO_RATED.equals(taxType)
                && !PurchaseOrderAmountCalculator.EXEMPT.equals(taxType)) {
            throw badRequest("부가세구분이 올바르지 않습니다.");
        }
        String included = vatIncludedAt(row);
        if (!"Y".equals(included) && !"N".equals(included)) {
            throw badRequest("부가세 포함 여부가 올바르지 않습니다.");
        }
        if ("Y".equals(included) && !PurchaseOrderAmountCalculator.TAXABLE.equals(taxType)) {
            throw badRequest("영세·면세는 부가세 포함을 선택할 수 없습니다.");
        }
    }

    private String vatIncludedAt(MaterialReceiptClosingRequestVO.Row row) {
        String value = text(row.getVatIncludedAt());
        return value == null ? "N" : value;
    }

    private Map<String, Object> baseParams(Long tenantId, MaterialReceiptClosingSearchVO search,
            boolean requireRange) {
        MaterialReceiptClosingSearchVO condition = search == null ? new MaterialReceiptClosingSearchVO() : search;
        Map<String, Object> params = tenantParams(tenantId);
        params.put("closingMonth", month(condition.getClosingMonth()));
        params.put("keyword", text(condition.getKeyword()));
        LocalDate from = date(condition.getReceiptFrom());
        LocalDate to = date(condition.getReceiptTo());
        if (requireRange && (from == null || to == null)) {
            throw badRequest("입고일 기간을 입력해 주세요.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw badRequest("시작일이 종료일보다 늦습니다.");
        }
        params.put("receiptFrom", from == null ? null : from.toString());
        params.put("receiptTo", to == null ? null : to.toString());
        return params;
    }

    private String month(String value) {
        String text = text(value);
        if (text == null || !MONTH.matcher(text).matches()) {
            throw badRequest("마감월 형식이 올바르지 않습니다.");
        }
        return text;
    }

    private LocalDate date(String value) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException exception) {
            throw badRequest("날짜 형식이 올바르지 않습니다.");
        }
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

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
