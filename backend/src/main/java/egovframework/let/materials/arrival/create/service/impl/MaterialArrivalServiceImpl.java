package egovframework.let.materials.arrival.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalCandidateVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalDetailSaveRequestVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalDetailVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalOrderRowVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalSaveRequestVO;
import egovframework.let.materials.arrival.create.domain.model.MaterialArrivalVO;
import egovframework.let.materials.arrival.create.domain.repository.MaterialArrivalDAO;
import egovframework.let.materials.arrival.create.service.MaterialArrivalService;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.order.create.service.impl.PurchaseOrderAmountCalculator;
import egovframework.let.materials.receipt.create.domain.model.MaterialReceiptVO;
import egovframework.let.materials.receipt.create.service.MaterialReceiptService;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

/**
 * 가입고 검증, 채번, 잔량 확인과 저장·수정·취소를 처리하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.16
 * @version 1.0
 */
@Service("materialArrivalService")
public class MaterialArrivalServiceImpl extends EgovAbstractServiceImpl implements MaterialArrivalService {

    static final String ARRIVAL_NO_GENERATOR_KEY = "MATERIAL_PROVISIONAL_NO";
    private static final String DEFAULT_CURRENCY = "KRW";
    private static final Pattern CURRENCY_PATTERN = Pattern.compile("^[A-Z]{3}$");
    private static final int NO_MAX_LENGTH = 30;
    private static final int MAX_DETAILS = 200;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;

    private final MaterialArrivalDAO arrivalDAO;
    private final PurchaseOrderDAO orderDAO;
    private final PurchaseRequestConfirmDAO confirmDAO;
    private final PurchaseRequestDAO requestDAO;
    private final IdSequenceService idSequenceService;
    private final MaterialReceiptService receiptService;

    public MaterialArrivalServiceImpl(MaterialArrivalDAO arrivalDAO, PurchaseOrderDAO orderDAO,
            PurchaseRequestConfirmDAO confirmDAO, PurchaseRequestDAO requestDAO,
            IdSequenceService idSequenceService, MaterialReceiptService receiptService) {
        this.arrivalDAO = arrivalDAO;
        this.orderDAO = orderDAO;
        this.confirmDAO = confirmDAO;
        this.requestDAO = requestDAO;
        this.idSequenceService = idSequenceService;
        this.receiptService = receiptService;
    }

    @Override
    public List<MaterialArrivalCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt,
            String keyword) throws Exception {
        requireTenant(tenantId);
        if (fromDt != null && toDt != null && fromDt.isAfter(toDt)) {
            throw badRequest("발주일 시작일은 종료일보다 늦을 수 없습니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        params.put("keyword", normalize(keyword));
        return arrivalDAO.selectCandidates(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialArrivalVO createArrival(Long tenantId, String userId, MaterialArrivalSaveRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        Header header = validateHeader(tenantId, payload);
        List<PreparedRow> rows = prepareCreateRows(tenantId, payload, header);

        PurchaseRequestRequesterVO receiver = findReceiver(tenantId, userId);
        Totals totals = sum(rows);
        String arrivalNo = generateNo(tenantId, header.arrivalDt);

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("arrivalNo", arrivalNo);
        hd.put("arrivalDt", header.arrivalDt);
        hd.put("supplierId", header.supplierId);
        hd.put("receiverId", receiver.getUserId());
        hd.put("receiverDeptId", receiver.getDepartmentId());
        hd.put("currencyCode", header.currencyCode);
        hd.put("taxType", header.taxType);
        hd.put("vatIncludedAt", header.vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", totals.supply);
        hd.put("vatAmt", totals.vat);
        hd.put("totalAmt", totals.total);
        hd.put("remark", header.remark);
        hd.put("createdBy", userId);
        Long materialArrivalId = arrivalDAO.insertArrivalHeader(hd);
        if (materialArrivalId == null || materialArrivalId < 1L) {
            throw new IllegalStateException("가입고 헤더 저장에 실패했습니다.");
        }

        int lineNo = 1;
        for (PreparedRow row : rows) {
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("materialArrivalId", materialArrivalId);
            dt.put("lineNo", lineNo++);
            dt.put("purchaseOrderDetailId", row.purchaseOrderDetailId);
            dt.put("materialId", row.materialId);
            dt.put("arrivalQty", row.arrivalQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("warehouseId", row.warehouseId);
            dt.put("manufactureDt", row.manufactureDt);
            dt.put("expireDt", row.expireDt);
            dt.put("lotNo", null);
            dt.put("inspectAt", row.inspectAt);
            dt.put("remark", row.remark);
            dt.put("createdBy", userId);
            Long detailId = arrivalDAO.insertArrivalDetail(dt);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("가입고 상세 저장에 실패했습니다.");
            }
        }
        // 무검사 행은 같은 트랜잭션에서 입고를 자동 등록한다. 검사 대상 행은 수입검사 이후 입고한다.
        MaterialReceiptVO receipt = receiptService.createFromArrival(tenantId, userId, receiver.getUserId(),
                receiver.getDepartmentId(), getArrival(tenantId, materialArrivalId));
        MaterialArrivalVO created = getArrival(tenantId, materialArrivalId);
        if (receipt != null) {
            created.setAutoReceiptNo(receipt.getReceiptNo());
            created.setAutoReceiptCount(receipt.getDetails() == null ? 0 : receipt.getDetails().size());
        }
        return created;
    }

    @Override
    public MaterialArrivalVO getArrival(Long tenantId, Long materialArrivalId) throws Exception {
        requireTenant(tenantId);
        if (materialArrivalId == null || materialArrivalId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialArrivalId", materialArrivalId);
        MaterialArrivalVO arrival = arrivalDAO.selectArrival(params);
        if (arrival == null) {
            throw notFound();
        }
        arrival.setDetails(arrivalDAO.selectArrivalDetails(params));
        return arrival;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialArrivalVO updateArrival(Long tenantId, String userId, Long materialArrivalId,
            MaterialArrivalSaveRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        MaterialArrivalVO locked = lockEditableArrival(tenantId, materialArrivalId, "취소된 가입고는 수정할 수 없습니다.");
        if (payload == null || payload.getArrivalDt() == null) {
            throw badRequest("가입고일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("모든 행을 뺄 수 없습니다. 가입고 취소를 사용해 주세요.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? locked.getTaxType() : taxType;
        boolean vatIncluded = validateTax(tenantId, taxType, payload.getVatIncludedAt());
        String remark = validateRemark(payload.getRemark());

        Map<String, Object> arrivalParams = tenantParams(tenantId);
        arrivalParams.put("materialArrivalId", materialArrivalId);
        Map<Long, MaterialArrivalDetailVO> existingById = new LinkedHashMap<Long, MaterialArrivalDetailVO>();
        for (MaterialArrivalDetailVO existing : arrivalDAO.selectArrivalDetails(arrivalParams)) {
            existingById.put(existing.getMaterialArrivalDetailId(), existing);
        }
        Map<Long, MaterialArrivalDetailSaveRequestVO> requestedById =
                new HashMap<Long, MaterialArrivalDetailSaveRequestVO>();
        for (MaterialArrivalDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getMaterialArrivalDetailId() == null
                    || !existingById.containsKey(detail.getMaterialArrivalDetailId())
                    || requestedById.put(detail.getMaterialArrivalDetailId(), detail) != null) {
                throw badRequest("가입고 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
        }

        // 이 가입고가 이미 차지한 발주 행별 수량(삭제될 행 포함). 삭제·수정되면 그만큼 잔량이 풀린다.
        Map<Long, BigDecimal> ownQtyByOrderDetail = new HashMap<Long, BigDecimal>();
        for (MaterialArrivalDetailVO existing : existingById.values()) {
            BigDecimal current = ownQtyByOrderDetail.get(existing.getPurchaseOrderDetailId());
            ownQtyByOrderDetail.put(existing.getPurchaseOrderDetailId(),
                    current == null ? existing.getArrivalQty() : current.add(existing.getArrivalQty()));
        }
        Map<Long, MaterialArrivalOrderRowVO> orderRows = lockOrderRows(tenantId,
                new TreeSet<Long>(ownQtyByOrderDetail.keySet()));

        Header header = new Header(payload.getArrivalDt(), locked.getSupplierId(), locked.getCurrencyCode(),
                taxType, vatIncluded, remark);
        List<MaterialArrivalDetailVO> keptExisting = new ArrayList<MaterialArrivalDetailVO>();
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        for (MaterialArrivalDetailVO existing : existingById.values()) {
            MaterialArrivalDetailSaveRequestVO detail = requestedById.get(existing.getMaterialArrivalDetailId());
            if (detail == null) {
                continue;
            }
            MaterialArrivalOrderRowVO orderRow = orderRows.get(existing.getPurchaseOrderDetailId());
            if (orderRow == null) {
                throw itemsChanged();
            }
            PreparedRow row = prepareRow(tenantId, header, detail, orderRow);
            prepared.add(row);
            keptExisting.add(existing);
        }
        requireLockedRowsUntouched(locked, payload, header, existingById, requestedById, keptExisting, prepared);
        Totals totals = sum(prepared);

        // 행번호 유일 제약 때문에 삭제를 먼저 하고, 남은 행은 기존 행번호 오름차순으로 다시 매긴다.
        for (MaterialArrivalDetailVO existing : existingById.values()) {
            if (requestedById.containsKey(existing.getMaterialArrivalDetailId())) {
                continue;
            }
            Map<String, Object> deleteParams = tenantParams(tenantId);
            deleteParams.put("materialArrivalId", materialArrivalId);
            deleteParams.put("materialArrivalDetailId", existing.getMaterialArrivalDetailId());
            if (arrivalDAO.deleteArrivalDetail(deleteParams) != 1) {
                throw concurrentChange();
            }
        }
        for (int index = 0; index < prepared.size(); index++) {
            PreparedRow row = prepared.get(index);
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("materialArrivalId", materialArrivalId);
            dt.put("materialArrivalDetailId", keptExisting.get(index).getMaterialArrivalDetailId());
            dt.put("lineNo", index + 1);
            dt.put("arrivalQty", row.arrivalQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("warehouseId", row.warehouseId);
            dt.put("manufactureDt", row.manufactureDt);
            dt.put("expireDt", row.expireDt);
            dt.put("remark", row.remark);
            dt.put("updatedBy", userId);
            if (arrivalDAO.updateArrivalDetail(dt) != 1) {
                throw concurrentChange();
            }
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("materialArrivalId", materialArrivalId);
        hd.put("arrivalDt", header.arrivalDt);
        hd.put("taxType", taxType);
        hd.put("vatIncludedAt", vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", totals.supply);
        hd.put("vatAmt", totals.vat);
        hd.put("totalAmt", totals.total);
        hd.put("remark", remark);
        hd.put("updatedBy", userId);
        if (arrivalDAO.updateArrivalHeader(hd) != 1) {
            throw concurrentChange();
        }
        return getArrival(tenantId, materialArrivalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MaterialArrivalVO cancelArrival(Long tenantId, String userId, Long materialArrivalId) throws Exception {
        requirePrincipal(tenantId, userId);
        lockEditableArrival(tenantId, materialArrivalId, "이미 취소된 가입고입니다.");
        Map<String, Object> cancelParams = tenantParams(tenantId);
        cancelParams.put("materialArrivalId", materialArrivalId);
        for (MaterialArrivalDetailVO detail : arrivalDAO.selectArrivalDetails(cancelParams)) {
            if (isLocked(detail)) {
                throw lockedBy(detail);
            }
        }
        cancelParams.put("materialArrivalId", materialArrivalId);
        cancelParams.put("updatedBy", userId);
        if (arrivalDAO.cancelArrivalHeader(cancelParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 가입고입니다.");
        }
        // 발주 잔량은 유효한 가입고 합으로 계산하므로 별도 복원 처리가 없다.
        return getArrival(tenantId, materialArrivalId);
    }

    /** 수정·취소 대상 가입고를 잠그고, 취소 여부와 후속 단계(입고·수입검사) 잠금 조건을 확인한다. */
    private MaterialArrivalVO lockEditableArrival(Long tenantId, Long materialArrivalId, String canceledMessage)
            throws Exception {
        if (materialArrivalId == null || materialArrivalId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialArrivalId", materialArrivalId);
        MaterialArrivalVO locked = arrivalDAO.selectArrivalForUpdate(params);
        if (locked == null) {
            throw notFound();
        }
        if (!"Y".equals(locked.getUseAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, canceledMessage);
        }
        return locked;
    }

    /**
     * 입고 또는 수입검사가 생긴 행은 가입고에서 수정·삭제할 수 없다(행 단위 잠금). 둘 다 없는 행은 그대로 수정할 수 있다.
     * 잠긴 행이 하나라도 있으면 헤더의 가입고일·부가세 설정도 바꿀 수 없고 비고만 수정할 수 있다.
     * 수입검사를 취소하면(검사 번호가 조회되지 않으면) 잠금이 풀린다.
     */
    private void requireLockedRowsUntouched(MaterialArrivalVO locked, MaterialArrivalSaveRequestVO payload,
            Header header, Map<Long, MaterialArrivalDetailVO> existingById,
            Map<Long, MaterialArrivalDetailSaveRequestVO> requestedById, List<MaterialArrivalDetailVO> keptExisting,
            List<PreparedRow> prepared) {
        MaterialArrivalDetailVO firstLocked = null;
        for (MaterialArrivalDetailVO existing : existingById.values()) {
            if (!isLocked(existing)) {
                continue;
            }
            firstLocked = firstLocked == null ? existing : firstLocked;
            if (!requestedById.containsKey(existing.getMaterialArrivalDetailId())) {
                throw lockedBy(existing);
            }
        }
        if (firstLocked == null) {
            return;
        }
        if (!Objects.equals(payload.getArrivalDt(), locked.getArrivalDt())
                || !Objects.equals(header.taxType, locked.getTaxType())
                || header.vatIncluded != "Y".equals(locked.getVatIncludedAt())) {
            throw lockedBy(firstLocked);
        }
        for (int index = 0; index < keptExisting.size(); index++) {
            MaterialArrivalDetailVO existing = keptExisting.get(index);
            if (isLocked(existing) && !sameRow(prepared.get(index), existing)) {
                throw lockedBy(existing);
            }
        }
    }

    private static boolean isLocked(MaterialArrivalDetailVO detail) {
        return detail.getReceiptNo() != null || detail.getInspectionNo() != null;
    }

    private ResponseStatusException lockedBy(MaterialArrivalDetailVO detail) {
        // 검사 대상 행은 검사에서 먼저 처리해야 하므로 입고번호가 함께 있어도 검사번호를 안내한다.
        return detail.getInspectionNo() != null ? inspectionLocked(detail.getInspectionNo())
                : receiptLocked(detail.getReceiptNo());
    }

    private boolean sameRow(PreparedRow row, MaterialArrivalDetailVO existing) {
        return sameNumber(row.arrivalQty, existing.getArrivalQty())
                && sameNumber(row.unitPrice, existing.getUnitPrice())
                && sameNumber(row.amounts.getSupplyAmt(), existing.getSupplyAmt())
                && sameNumber(row.amounts.getVatAmt(), existing.getVatAmt())
                && sameNumber(row.amounts.getTotalAmt(), existing.getTotalAmt())
                && Objects.equals(row.warehouseId, existing.getWarehouseId())
                && Objects.equals(row.manufactureDt, existing.getManufactureDt())
                && Objects.equals(row.expireDt, existing.getExpireDt())
                && Objects.equals(row.remark, normalize(existing.getRemark()));
    }

    private static boolean sameNumber(BigDecimal left, BigDecimal right) {
        if (left == null || right == null) {
            return left == right;
        }
        return left.compareTo(right) == 0;
    }

    private ResponseStatusException receiptLocked(String receiptNo) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "입고가 등록된 품목은 가입고에서 수정·삭제·취소할 수 없습니다. 입고 " + receiptNo + "에서 처리해 주세요.");
    }

    private ResponseStatusException inspectionLocked(String inspectionNo) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "수입검사가 등록된 품목은 가입고에서 수정·삭제·취소할 수 없습니다. 수입검사 " + inspectionNo + "에서 처리해 주세요.");
    }

    private Header validateHeader(Long tenantId, MaterialArrivalSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getArrivalDt() == null) {
            throw badRequest("가입고일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("가입고할 품목을 입력해 주세요.");
        }
        if (payload.getDetails().size() > MAX_DETAILS) {
            throw badRequest("한 번에 가입고할 수 있는 품목은 " + MAX_DETAILS + "행까지입니다.");
        }
        if (payload.getSupplierId() == null
                || !confirmDAO.existsSupplier(referenceParams(tenantId, "id", payload.getSupplierId()))) {
            throw badRequest("사용할 수 없는 구매처입니다.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? PurchaseOrderAmountCalculator.TAXABLE : taxType;
        boolean vatIncluded = validateTax(tenantId, taxType, payload.getVatIncludedAt());
        String remark = validateRemark(payload.getRemark());
        return new Header(payload.getArrivalDt(), payload.getSupplierId(), null, taxType, vatIncluded, remark);
    }

    private boolean validateTax(Long tenantId, String taxType, String vatIncludedAtValue) throws Exception {
        if (!orderDAO.existsTaxType(referenceParams(tenantId, "code", taxType))) {
            throw badRequest("사용할 수 없는 부가세구분입니다.");
        }
        String vatIncludedAt = normalize(vatIncludedAtValue);
        vatIncludedAt = vatIncludedAt == null ? "N" : vatIncludedAt;
        if (!"Y".equals(vatIncludedAt) && !"N".equals(vatIncludedAt)) {
            throw badRequest("부가세 포함 여부는 Y 또는 N이어야 합니다.");
        }
        boolean vatIncluded = "Y".equals(vatIncludedAt);
        if (vatIncluded && !PurchaseOrderAmountCalculator.TAXABLE.equals(taxType)) {
            throw badRequest("영세·면세는 부가세 포함을 선택할 수 없습니다.");
        }
        return vatIncluded;
    }

    private String validateRemark(String value) {
        String remark = normalize(value);
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        return remark;
    }

    private List<PreparedRow> prepareCreateRows(Long tenantId, MaterialArrivalSaveRequestVO payload, Header header)
            throws Exception {
        TreeSet<Long> unique = new TreeSet<Long>();
        for (MaterialArrivalDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseOrderDetailId() == null) {
                throw badRequest("가입고할 발주 품목을 선택해 주세요.");
            }
            if (!unique.add(detail.getPurchaseOrderDetailId())) {
                throw badRequest("같은 발주 품목을 중복해서 가입고할 수 없습니다.");
            }
        }
        Map<Long, MaterialArrivalOrderRowVO> orderRows = lockOrderRows(tenantId, unique);
        if (orderRows.size() != unique.size()) {
            throw itemsChanged();
        }
        String currencyCode = null;
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        for (MaterialArrivalDetailSaveRequestVO detail : payload.getDetails()) {
            MaterialArrivalOrderRowVO orderRow = orderRows.get(detail.getPurchaseOrderDetailId());
            if (!"Y".equals(orderRow.getOrderUseAt()) || !"N".equals(orderRow.getReceiptCloseAt())) {
                throw itemsChanged();
            }
            if (!header.supplierId.equals(orderRow.getSupplierId())) {
                throw badRequest("구매처가 다른 발주 품목은 함께 가입고할 수 없습니다.");
            }
            String rowCurrency = orderRow.getCurrencyCode() == null ? DEFAULT_CURRENCY : orderRow.getCurrencyCode();
            if (currencyCode == null) {
                currencyCode = rowCurrency;
            } else if (!currencyCode.equals(rowCurrency)) {
                throw badRequest("통화가 다른 발주 품목은 함께 가입고할 수 없습니다.");
            }
            PreparedRow row = prepareRow(tenantId, header, detail, orderRow);
            prepared.add(row);
        }
        header.currencyCode = currencyCode == null ? DEFAULT_CURRENCY : currencyCode;
        if (!CURRENCY_PATTERN.matcher(header.currencyCode).matches()) {
            throw badRequest("통화 코드가 올바르지 않습니다.");
        }
        return prepared;
    }

    /**
     * 발주 행을 잠근 뒤 같은 행을 다시 읽어 최신 가입고 합계를 쓴다.
     * 잠금 대기 중 다른 가입고가 커밋되면 첫 조회의 합계는 오래된 값일 수 있어, 잠근 뒤 새 문장으로 다시 조회한다.
     */
    private Map<Long, MaterialArrivalOrderRowVO> lockOrderRows(Long tenantId, TreeSet<Long> orderDetailIds)
            throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(orderDetailIds));
        params.put("forUpdate", Boolean.TRUE);
        arrivalDAO.selectOrderRows(params);
        params.put("forUpdate", Boolean.FALSE);
        Map<Long, MaterialArrivalOrderRowVO> byId = new HashMap<Long, MaterialArrivalOrderRowVO>();
        for (MaterialArrivalOrderRowVO row : arrivalDAO.selectOrderRows(params)) {
            byId.put(row.getPurchaseOrderDetailId(), row);
        }
        return byId;
    }

    private PreparedRow prepareRow(Long tenantId, Header header, MaterialArrivalDetailSaveRequestVO detail,
            MaterialArrivalOrderRowVO orderRow) throws Exception {
        if (detail.getArrivalQty() == null || detail.getArrivalQty().signum() <= 0) {
            throw badRequest("가입고수량은 0보다 커야 합니다.");
        }
        BigDecimal arrivalQty = decimal(detail.getArrivalQty(), "가입고수량");
        if (detail.getUnitPrice() == null) {
            throw badRequest("가입고단가를 입력해 주세요.");
        }
        if (detail.getUnitPrice().signum() < 0) {
            throw badRequest("가입고단가는 0 이상이어야 합니다.");
        }
        BigDecimal unitPrice = decimal(detail.getUnitPrice(), "가입고단가");
        Long warehouseId = detail.getWarehouseId() != null ? detail.getWarehouseId() : orderRow.getWarehouseId();
        if (warehouseId == null) {
            throw badRequest("입고창고를 선택해 주세요.");
        }
        if (!confirmDAO.existsWarehouse(referenceParams(tenantId, "id", warehouseId))) {
            throw badRequest("사용할 수 없는 입고창고입니다.");
        }
        if (detail.getManufactureDt() != null && detail.getExpireDt() != null
                && detail.getExpireDt().isBefore(detail.getManufactureDt())) {
            throw badRequest("소비기한은 제조일 이후여야 합니다.");
        }
        String remark = validateRemark(detail.getRemark());
        BigDecimal vatOverride = detail.getVatAmt() == null ? null : decimal(detail.getVatAmt(), "세액");
        PurchaseOrderAmountCalculator.Amounts amounts;
        try {
            amounts = PurchaseOrderAmountCalculator.calculate(arrivalQty, unitPrice, header.taxType,
                    header.vatIncluded, vatOverride);
        } catch (IllegalArgumentException exception) {
            throw badRequest(exception.getMessage());
        }
        if (amounts.getTotalAmt().precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("금액이 허용 범위를 초과했습니다.");
        }
        return new PreparedRow(orderRow.getPurchaseOrderDetailId(), orderRow.getMaterialId(), arrivalQty, unitPrice,
                warehouseId, detail.getManufactureDt(), detail.getExpireDt(), orderRow.getInspectAt(), remark,
                amounts);
    }

    private Totals sum(List<PreparedRow> rows) {
        Totals totals = new Totals();
        for (PreparedRow row : rows) {
            totals.supply = totals.supply.add(row.amounts.getSupplyAmt());
            totals.vat = totals.vat.add(row.amounts.getVatAmt());
            totals.total = totals.total.add(row.amounts.getTotalAmt());
        }
        if (totals.total.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("합계금액이 허용 범위를 초과했습니다.");
        }
        return totals;
    }

    private PurchaseRequestRequesterVO findReceiver(Long tenantId, String userId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("loginCode", userId);
        PurchaseRequestRequesterVO receiver = requestDAO.selectRequester(params);
        if (receiver == null || receiver.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "가입고 담당자 사용자 정보를 찾을 수 없습니다.");
        }
        return receiver;
    }

    private String generateNo(Long tenantId, LocalDate dt) throws Exception {
        String dateKey = dt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(ARRIVAL_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("가입고번호를 생성할 수 없습니다.");
        }
        String no = String.format(Locale.ROOT, "%s-%s-%04d", "MP", dateKey, sequence);
        if (no.length() > NO_MAX_LENGTH) {
            throw new IllegalStateException("가입고번호를 생성할 수 없습니다.");
        }
        return no;
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

    private Map<String, Object> referenceParams(Long tenantId, String key, Object value) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put(key, value);
        return params;
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "가입고를 찾을 수 없습니다.");
    }

    private ResponseStatusException itemsChanged() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "가입고할 발주 품목이 변경되었습니다. 화면을 다시 조회해 주세요.");
    }

    private ResponseStatusException concurrentChange() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "가입고 상세가 동시에 변경되었습니다. 다시 조회해 주세요.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class Header {
        private final LocalDate arrivalDt;
        private final Long supplierId;
        private String currencyCode;
        private final String taxType;
        private final boolean vatIncluded;
        private final String remark;

        private Header(LocalDate arrivalDt, Long supplierId, String currencyCode, String taxType,
                boolean vatIncluded, String remark) {
            this.arrivalDt = arrivalDt;
            this.supplierId = supplierId;
            this.currencyCode = currencyCode;
            this.taxType = taxType;
            this.vatIncluded = vatIncluded;
            this.remark = remark;
        }
    }

    private static final class PreparedRow {
        private final Long purchaseOrderDetailId;
        private final Long materialId;
        private final BigDecimal arrivalQty;
        private final BigDecimal unitPrice;
        private final Long warehouseId;
        private final LocalDate manufactureDt;
        private final LocalDate expireDt;
        private final String inspectAt;
        private final String remark;
        private final PurchaseOrderAmountCalculator.Amounts amounts;

        private PreparedRow(Long purchaseOrderDetailId, Long materialId, BigDecimal arrivalQty, BigDecimal unitPrice,
                Long warehouseId, LocalDate manufactureDt, LocalDate expireDt, String inspectAt, String remark,
                PurchaseOrderAmountCalculator.Amounts amounts) {
            this.purchaseOrderDetailId = purchaseOrderDetailId;
            this.materialId = materialId;
            this.arrivalQty = arrivalQty;
            this.unitPrice = unitPrice;
            this.warehouseId = warehouseId;
            this.manufactureDt = manufactureDt;
            this.expireDt = expireDt;
            this.inspectAt = inspectAt;
            this.remark = remark;
            this.amounts = amounts;
        }
    }

    private static final class Totals {
        private BigDecimal supply = BigDecimal.ZERO.setScale(SCALE);
        private BigDecimal vat = BigDecimal.ZERO.setScale(SCALE);
        private BigDecimal total = BigDecimal.ZERO.setScale(SCALE);
    }
}
