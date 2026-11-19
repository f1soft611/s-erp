package egovframework.let.materials.receipt.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalDetailVO;
import egovframework.let.materials.arrival.create.domain.model.PurchaseArrivalVO;
import egovframework.let.materials.arrival.create.domain.repository.PurchaseArrivalDAO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.order.create.service.impl.PurchaseOrderAmountCalculator;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptCandidateVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptDetailVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptInspectionRowVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptSaveRequestVO;
import egovframework.let.materials.receipt.create.domain.model.PurchaseReceiptVO;
import egovframework.let.materials.receipt.create.domain.repository.PurchaseReceiptDAO;
import egovframework.let.materials.receipt.create.service.PurchaseReceiptService;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

/**
 * 입고 조회·수정·취소, 무검사 자동 입고, 수입검사 합격분 수동 등록을 처리하는 서비스 구현 클래스.
 * 무검사 입고 행의 수정·취소는 연결된 가입고 행에도 반영한다. 수입검사 합격분 입고 행은 가입고·검사에 반영하지 않으며
 * 입고수량이 입고 가능량(합격량 − 유효 입고 합)을 넘을 수 없다. 가입고 서비스를 호출하지 않고 가입고 DAO를 직접 써서
 * 서비스 간 순환 의존을 만들지 않는다.
 *
 * @author S-ERP
 * @since 2026.11.17
 * @version 1.0
 */
@Service("purchaseReceiptService")
public class PurchaseReceiptServiceImpl extends EgovAbstractServiceImpl implements PurchaseReceiptService {

    static final String RECEIPT_NO_GENERATOR_KEY = "MATERIAL_RECEIPT_NO";
    private static final int NO_MAX_LENGTH = 30;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;
    private static final int MAX_DETAILS = 200;

    private final PurchaseReceiptDAO receiptDAO;
    private final PurchaseArrivalDAO arrivalDAO;
    private final PurchaseOrderDAO orderDAO;
    private final PurchaseRequestConfirmDAO confirmDAO;
    private final PurchaseRequestDAO requestDAO;
    private final IdSequenceService idSequenceService;

    public PurchaseReceiptServiceImpl(PurchaseReceiptDAO receiptDAO, PurchaseArrivalDAO arrivalDAO,
            PurchaseOrderDAO orderDAO, PurchaseRequestConfirmDAO confirmDAO, PurchaseRequestDAO requestDAO,
            IdSequenceService idSequenceService) {
        this.receiptDAO = receiptDAO;
        this.arrivalDAO = arrivalDAO;
        this.orderDAO = orderDAO;
        this.confirmDAO = confirmDAO;
        this.requestDAO = requestDAO;
        this.idSequenceService = idSequenceService;
    }

    @Override
    public List<PurchaseReceiptCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt,
            String keyword) throws Exception {
        requireTenant(tenantId);
        if (fromDt != null && toDt != null && fromDt.isAfter(toDt)) {
            throw badRequest("검사일 시작일은 종료일보다 늦을 수 없습니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        params.put("keyword", normalize(keyword));
        return receiptDAO.selectCandidates(params);
    }

    @Override
    public int countCandidates(Long tenantId) throws Exception {
        requireTenant(tenantId);
        Integer count = receiptDAO.countCandidates(tenantParams(tenantId));
        return count == null ? 0 : count;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseReceiptVO createReceipt(Long tenantId, String userId, PurchaseReceiptSaveRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        if (payload == null || payload.getReceiptDt() == null) {
            throw badRequest("입고일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("입고할 수입검사 품목을 불러와 주세요.");
        }
        if (payload.getDetails().size() > MAX_DETAILS) {
            throw badRequest("한 번에 입고할 수 있는 품목은 " + MAX_DETAILS + "행까지입니다.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? PurchaseOrderAmountCalculator.TAXABLE : taxType;
        boolean vatIncluded = validateTax(tenantId, taxType, payload.getVatIncludedAt());
        String remark = validateRemark(payload.getRemark());

        TreeSet<Long> inspectionDetailIds = new TreeSet<Long>();
        for (PurchaseReceiptDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getQualityInspectionDetailId() == null) {
                throw badRequest("입고할 수입검사 품목을 선택해 주세요.");
            }
            if (!inspectionDetailIds.add(detail.getQualityInspectionDetailId())) {
                throw badRequest("같은 수입검사 품목을 중복해서 입고할 수 없습니다.");
            }
        }
        PurchaseRequestRequesterVO receiver = findReceiver(tenantId, userId);

        Map<Long, PurchaseReceiptInspectionRowVO> inspectionRows = lockInspectionRows(tenantId, inspectionDetailIds, null);
        Long supplierId = null;
        String currencyCode = null;
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        List<PurchaseReceiptInspectionRowVO> sources = new ArrayList<PurchaseReceiptInspectionRowVO>();
        for (PurchaseReceiptDetailSaveRequestVO detail : payload.getDetails()) {
            PurchaseReceiptInspectionRowVO source = inspectionRows.get(detail.getQualityInspectionDetailId());
            if (source == null || !"Y".equals(source.getInspectionUseAt()) || source.getPurchaseArrivalDetailId() == null
                    || !"Y".equals(source.getArrivalUseAt())) {
                throw inspectionChanged();
            }
            if (supplierId == null) {
                supplierId = source.getSupplierId();
            } else if (!supplierId.equals(source.getSupplierId())) {
                throw badRequest("구매처가 다른 수입검사 품목은 함께 입고할 수 없습니다.");
            }
            if (currencyCode == null) {
                currencyCode = source.getCurrencyCode();
            } else if (!currencyCode.equals(source.getCurrencyCode())) {
                throw badRequest("통화가 다른 수입검사 품목은 함께 입고할 수 없습니다.");
            }
            PreparedRow row = prepareRow(tenantId, taxType, vatIncluded, detail, null);
            requireWithinReceivable(source, row.receiptQty);
            prepared.add(row);
            sources.add(source);
        }
        Totals totals = sum(prepared);

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("receiptNo", generateNo(tenantId, payload.getReceiptDt()));
        hd.put("receiptDt", payload.getReceiptDt());
        hd.put("supplierId", supplierId);
        hd.put("receiverId", receiver.getUserId());
        hd.put("receiverDeptId", receiver.getDepartmentId());
        hd.put("currencyCode", currencyCode);
        hd.put("taxType", taxType);
        hd.put("vatIncludedAt", vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", totals.supply);
        hd.put("vatAmt", totals.vat);
        hd.put("totalAmt", totals.total);
        hd.put("remark", remark);
        hd.put("createdBy", userId);
        Long purchaseReceiptId = receiptDAO.insertReceiptHeader(hd);
        if (purchaseReceiptId == null || purchaseReceiptId < 1L) {
            throw new IllegalStateException("입고 헤더 저장에 실패했습니다.");
        }
        for (int index = 0; index < prepared.size(); index++) {
            PreparedRow row = prepared.get(index);
            PurchaseReceiptInspectionRowVO source = sources.get(index);
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("purchaseReceiptId", purchaseReceiptId);
            dt.put("lineNo", index + 1);
            dt.put("purchaseArrivalDetailId", source.getPurchaseArrivalDetailId());
            dt.put("arrivalNo", source.getArrivalNo());
            dt.put("qualityInspectionDetailId", source.getQualityInspectionDetailId());
            dt.put("inspectionNo", source.getInspectionNo());
            dt.put("purchaseOrderDetailId", source.getPurchaseOrderDetailId());
            dt.put("materialId", source.getMaterialId());
            dt.put("receiptQty", row.receiptQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("warehouseId", row.warehouseId);
            dt.put("manufactureDt", row.manufactureDt);
            dt.put("expireDt", row.expireDt);
            dt.put("lotNo", null);
            dt.put("remark", row.remark);
            dt.put("createdBy", userId);
            Long detailId = receiptDAO.insertReceiptDetail(dt);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("입고 상세 저장에 실패했습니다.");
            }
        }
        return getReceipt(tenantId, purchaseReceiptId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseReceiptVO createFromArrival(Long tenantId, String userId, Long receiverId, Long receiverDeptId,
            PurchaseArrivalVO arrival) throws Exception {
        requirePrincipal(tenantId, userId);
        List<PurchaseArrivalDetailVO> rows = new ArrayList<PurchaseArrivalDetailVO>();
        if (arrival != null && arrival.getDetails() != null) {
            for (PurchaseArrivalDetailVO detail : arrival.getDetails()) {
                if ("N".equals(detail.getInspectAt())) {
                    rows.add(detail);
                }
            }
        }
        if (rows.isEmpty()) {
            return null;
        }
        BigDecimal supply = BigDecimal.ZERO;
        BigDecimal vat = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseArrivalDetailVO row : rows) {
            supply = supply.add(zeroIfNull(row.getSupplyAmt()));
            vat = vat.add(zeroIfNull(row.getVatAmt()));
            total = total.add(zeroIfNull(row.getTotalAmt()));
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("receiptNo", generateNo(tenantId, arrival.getArrivalDt()));
        hd.put("receiptDt", arrival.getArrivalDt());
        hd.put("supplierId", arrival.getSupplierId());
        hd.put("receiverId", receiverId);
        hd.put("receiverDeptId", receiverDeptId);
        hd.put("currencyCode", arrival.getCurrencyCode());
        hd.put("taxType", arrival.getTaxType());
        hd.put("vatIncludedAt", arrival.getVatIncludedAt());
        hd.put("supplyAmt", supply);
        hd.put("vatAmt", vat);
        hd.put("totalAmt", total);
        hd.put("remark", null);
        hd.put("createdBy", userId);
        Long purchaseReceiptId = receiptDAO.insertReceiptHeader(hd);
        if (purchaseReceiptId == null || purchaseReceiptId < 1L) {
            throw new IllegalStateException("입고 헤더 저장에 실패했습니다.");
        }

        int lineNo = 1;
        for (PurchaseArrivalDetailVO row : rows) {
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("purchaseReceiptId", purchaseReceiptId);
            dt.put("lineNo", lineNo++);
            dt.put("purchaseArrivalDetailId", row.getPurchaseArrivalDetailId());
            dt.put("arrivalNo", arrival.getArrivalNo());
            dt.put("purchaseOrderDetailId", row.getPurchaseOrderDetailId());
            dt.put("materialId", row.getMaterialId());
            dt.put("receiptQty", row.getArrivalQty());
            dt.put("unitPrice", row.getUnitPrice());
            dt.put("supplyAmt", row.getSupplyAmt());
            dt.put("vatAmt", row.getVatAmt());
            dt.put("totalAmt", row.getTotalAmt());
            dt.put("warehouseId", row.getWarehouseId());
            dt.put("manufactureDt", row.getManufactureDt());
            dt.put("expireDt", row.getExpireDt());
            dt.put("lotNo", null);
            dt.put("remark", row.getRemark());
            dt.put("createdBy", userId);
            Long detailId = receiptDAO.insertReceiptDetail(dt);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("입고 상세 저장에 실패했습니다.");
            }
        }
        return getReceipt(tenantId, purchaseReceiptId);
    }

    @Override
    public PurchaseReceiptVO getReceipt(Long tenantId, Long purchaseReceiptId) throws Exception {
        requireTenant(tenantId);
        if (purchaseReceiptId == null || purchaseReceiptId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseReceiptId", purchaseReceiptId);
        PurchaseReceiptVO receipt = receiptDAO.selectReceipt(params);
        if (receipt == null) {
            throw notFound();
        }
        receipt.setDetails(receiptDAO.selectReceiptDetails(params));
        return receipt;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseReceiptVO updateReceipt(Long tenantId, String userId, Long purchaseReceiptId,
            PurchaseReceiptSaveRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        PurchaseReceiptVO locked = lockEditableReceipt(tenantId, purchaseReceiptId, "취소된 입고는 수정할 수 없습니다.");
        if (payload == null || payload.getReceiptDt() == null) {
            throw badRequest("입고일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("모든 행을 뺄 수 없습니다. 입고 취소를 사용해 주세요.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? locked.getTaxType() : taxType;
        boolean vatIncluded = validateTax(tenantId, taxType, payload.getVatIncludedAt());
        String remark = validateRemark(payload.getRemark());

        Map<Long, PurchaseReceiptDetailVO> existingById = loadReceiptRows(tenantId, purchaseReceiptId);
        requireNoClosedRow(locked, existingById.values());
        Map<Long, PurchaseReceiptDetailSaveRequestVO> requestedById =
                new HashMap<Long, PurchaseReceiptDetailSaveRequestVO>();
        for (PurchaseReceiptDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseReceiptDetailId() == null
                    || !existingById.containsKey(detail.getPurchaseReceiptDetailId())
                    || requestedById.put(detail.getPurchaseReceiptDetailId(), detail) != null) {
                throw badRequest("입고 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
        }
        lockOrderRows(tenantId, existingById.values());
        Map<Long, PurchaseReceiptInspectionRowVO> inspectionRows =
                lockLinkedInspectionRows(tenantId, purchaseReceiptId, existingById.values());

        List<PurchaseReceiptDetailVO> keptExisting = new ArrayList<PurchaseReceiptDetailVO>();
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        Map<Long, ArrivalSync> syncs = new LinkedHashMap<Long, ArrivalSync>();
        for (PurchaseReceiptDetailVO existing : existingById.values()) {
            PurchaseReceiptDetailSaveRequestVO detail = requestedById.get(existing.getPurchaseReceiptDetailId());
            PreparedRow row = null;
            if (detail != null) {
                row = prepareRow(tenantId, taxType, vatIncluded, detail, existing.getWarehouseId());
                if (existing.getQualityInspectionDetailId() != null) {
                    PurchaseReceiptInspectionRowVO source = inspectionRows.get(existing.getQualityInspectionDetailId());
                    if (source == null) {
                        throw concurrentChange();
                    }
                    requireWithinReceivable(source, row.receiptQty);
                }
                prepared.add(row);
                keptExisting.add(existing);
            }
            if (isLinkedNoInspection(existing)) {
                ArrivalSync sync = syncFor(tenantId, syncs, existing.getPurchaseArrivalId());
                if (row != null) {
                    sync.updates.put(existing.getPurchaseArrivalDetailId(), row);
                } else {
                    sync.removed.add(existing.getPurchaseArrivalDetailId());
                }
            }
        }
        Totals totals = sum(prepared);

        for (Map.Entry<Long, ArrivalSync> entry : syncs.entrySet()) {
            applyArrival(tenantId, userId, entry.getKey(), entry.getValue(), taxType, vatIncluded);
        }

        // 행번호 유일 제약 때문에 삭제를 먼저 하고, 남은 행은 기존 행번호 오름차순으로 다시 매긴다.
        for (PurchaseReceiptDetailVO existing : existingById.values()) {
            if (requestedById.containsKey(existing.getPurchaseReceiptDetailId())) {
                continue;
            }
            Map<String, Object> deleteParams = tenantParams(tenantId);
            deleteParams.put("purchaseReceiptId", purchaseReceiptId);
            deleteParams.put("purchaseReceiptDetailId", existing.getPurchaseReceiptDetailId());
            if (receiptDAO.deleteReceiptDetail(deleteParams) != 1) {
                throw concurrentChange();
            }
        }
        for (int index = 0; index < prepared.size(); index++) {
            PreparedRow row = prepared.get(index);
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("purchaseReceiptId", purchaseReceiptId);
            dt.put("purchaseReceiptDetailId", keptExisting.get(index).getPurchaseReceiptDetailId());
            dt.put("lineNo", index + 1);
            dt.put("receiptQty", row.receiptQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("warehouseId", row.warehouseId);
            dt.put("manufactureDt", row.manufactureDt);
            dt.put("expireDt", row.expireDt);
            dt.put("remark", row.remark);
            dt.put("updatedBy", userId);
            if (receiptDAO.updateReceiptDetail(dt) != 1) {
                throw concurrentChange();
            }
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("purchaseReceiptId", purchaseReceiptId);
        hd.put("receiptDt", payload.getReceiptDt());
        hd.put("taxType", taxType);
        hd.put("vatIncludedAt", vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", totals.supply);
        hd.put("vatAmt", totals.vat);
        hd.put("totalAmt", totals.total);
        hd.put("remark", remark);
        hd.put("updatedBy", userId);
        if (receiptDAO.updateReceiptHeader(hd) != 1) {
            throw concurrentChange();
        }
        return getReceipt(tenantId, purchaseReceiptId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseReceiptVO cancelReceipt(Long tenantId, String userId, Long purchaseReceiptId) throws Exception {
        requirePrincipal(tenantId, userId);
        PurchaseReceiptVO locked = lockEditableReceipt(tenantId, purchaseReceiptId, "이미 취소된 입고입니다.");
        Map<Long, PurchaseReceiptDetailVO> rows = loadReceiptRows(tenantId, purchaseReceiptId);
        requireNoClosedRow(locked, rows.values());
        lockOrderRows(tenantId, rows.values());

        // 무검사 행은 연결된 가입고 행을 함께 정리한다. 검사 대상 행은 가입고를 그대로 둔다.
        Map<Long, ArrivalSync> syncs = new LinkedHashMap<Long, ArrivalSync>();
        for (PurchaseReceiptDetailVO row : rows.values()) {
            if (isLinkedNoInspection(row)) {
                syncFor(tenantId, syncs, row.getPurchaseArrivalId()).removed.add(row.getPurchaseArrivalDetailId());
            }
        }
        for (Map.Entry<Long, ArrivalSync> entry : syncs.entrySet()) {
            applyArrival(tenantId, userId, entry.getKey(), entry.getValue(), null, false);
        }

        Map<String, Object> cancelParams = tenantParams(tenantId);
        cancelParams.put("purchaseReceiptId", purchaseReceiptId);
        cancelParams.put("updatedBy", userId);
        if (receiptDAO.cancelReceiptHeader(cancelParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 입고입니다.");
        }
        return getReceipt(tenantId, purchaseReceiptId);
    }

    /** 수정·취소 대상 입고를 잠그고 취소 여부를 확인한다. */
    private PurchaseReceiptVO lockEditableReceipt(Long tenantId, Long purchaseReceiptId, String canceledMessage)
            throws Exception {
        if (purchaseReceiptId == null || purchaseReceiptId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseReceiptId", purchaseReceiptId);
        PurchaseReceiptVO locked = receiptDAO.selectReceiptForUpdate(params);
        if (locked == null) {
            throw notFound();
        }
        if (!"Y".equals(locked.getUseAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, canceledMessage);
        }
        return locked;
    }

    /** 매입마감된 행이 있는 입고는 수정·행 빼기·취소할 수 없다(마감을 해제하면 가능). */
    private void requireNoClosedRow(PurchaseReceiptVO receipt, Iterable<PurchaseReceiptDetailVO> rows) {
        for (PurchaseReceiptDetailVO row : rows) {
            String month = row.getClosingMonth();
            if (month != null && !month.isEmpty()) {
                String shown = month.length() == 6 ? month.substring(0, 4) + "-" + month.substring(4) : month;
                throw new ResponseStatusException(HttpStatus.CONFLICT, "입고 " + receipt.getReceiptNo()
                        + "에 매입마감된 행이 있습니다(마감월 " + shown + "). 매입마감을 해제한 뒤 처리해 주세요.");
            }
        }
    }

    private Map<Long, PurchaseReceiptDetailVO> loadReceiptRows(Long tenantId, Long purchaseReceiptId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseReceiptId", purchaseReceiptId);
        Map<Long, PurchaseReceiptDetailVO> byId = new LinkedHashMap<Long, PurchaseReceiptDetailVO>();
        for (PurchaseReceiptDetailVO detail : receiptDAO.selectReceiptDetails(params)) {
            byId.put(detail.getPurchaseReceiptDetailId(), detail);
        }
        return byId;
    }

    /** 같은 발주 행을 다루는 가입고·입고 작업과 겹치지 않도록 발주 행을 ID 순서로 잠근다. */
    private void lockOrderRows(Long tenantId, Iterable<PurchaseReceiptDetailVO> rows) throws Exception {
        TreeSet<Long> orderDetailIds = new TreeSet<Long>();
        for (PurchaseReceiptDetailVO row : rows) {
            orderDetailIds.add(row.getPurchaseOrderDetailId());
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(orderDetailIds));
        params.put("forUpdate", Boolean.TRUE);
        arrivalDAO.selectOrderRows(params);
    }

    /** 가입고 행이 남아 있는 무검사 입고 행인지(수정·취소가 가입고에 반영되는 행인지). */
    private boolean isLinkedNoInspection(PurchaseReceiptDetailVO row) {
        return row.getPurchaseArrivalDetailId() != null && row.getPurchaseArrivalId() != null
                && "N".equals(row.getInspectAt()) && "Y".equals(row.getArrivalActive());
    }

    private ArrivalSync syncFor(Long tenantId, Map<Long, ArrivalSync> syncs, Long arrivalId) throws Exception {
        ArrivalSync sync = syncs.get(arrivalId);
        if (sync != null) {
            return sync;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseArrivalId", arrivalId);
        if (arrivalDAO.selectArrivalForUpdate(params) == null) {
            throw concurrentChange();
        }
        sync = new ArrivalSync();
        sync.arrival = arrivalDAO.selectArrival(params);
        if (sync.arrival == null) {
            throw concurrentChange();
        }
        for (PurchaseArrivalDetailVO detail : arrivalDAO.selectArrivalDetails(params)) {
            sync.rows.put(detail.getPurchaseArrivalDetailId(), detail);
        }
        syncs.put(arrivalId, sync);
        return sync;
    }

    /**
     * 입고에서 바뀐 내용을 연결된 가입고에 반영한다.
     * 가입고 행이 하나도 남지 않으면 행은 이력으로 남기고 가입고 헤더만 취소한다.
     * 그렇지 않으면 빠진 행을 삭제하고 행번호를 다시 매기며 가입고 헤더 금액을 행 합으로 다시 계산한다.
     * taxType이 null이면 가입고의 부가세 설정을 유지한다. 부가세 설정이 바뀌면 입고와 연결되지 않은 가입고 행의 금액도 다시 계산한다.
     */
    private void applyArrival(Long tenantId, String userId, Long arrivalId, ArrivalSync sync, String taxType,
            boolean vatIncluded) throws Exception {
        PurchaseArrivalVO arrival = sync.arrival;
        if (!sync.removed.isEmpty() && sync.removed.containsAll(sync.rows.keySet())) {
            Map<String, Object> cancel = tenantParams(tenantId);
            cancel.put("purchaseArrivalId", arrivalId);
            cancel.put("updatedBy", userId);
            if (arrivalDAO.cancelArrivalHeader(cancel) != 1) {
                throw concurrentChange();
            }
            return;
        }
        for (Long removedId : sync.removed) {
            Map<String, Object> delete = tenantParams(tenantId);
            delete.put("purchaseArrivalId", arrivalId);
            delete.put("purchaseArrivalDetailId", removedId);
            if (arrivalDAO.deleteArrivalDetail(delete) != 1) {
                throw concurrentChange();
            }
        }
        boolean arrivalVatIncluded = "Y".equals(arrival.getVatIncludedAt());
        String targetTax = taxType == null ? arrival.getTaxType() : taxType;
        boolean targetVat = taxType == null ? arrivalVatIncluded : vatIncluded;
        boolean taxChanged = !Objects.equals(targetTax, arrival.getTaxType()) || targetVat != arrivalVatIncluded;

        BigDecimal supply = BigDecimal.ZERO;
        BigDecimal vat = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int lineNo = 0;
        for (PurchaseArrivalDetailVO row : sync.rows.values()) {
            if (sync.removed.contains(row.getPurchaseArrivalDetailId())) {
                continue;
            }
            lineNo++;
            PreparedRow changed = sync.updates.get(row.getPurchaseArrivalDetailId());
            if (changed != null) {
                putArrivalRow(tenantId, userId, arrivalId, row, lineNo, changed.receiptQty, changed.unitPrice,
                        changed.amounts, changed.warehouseId, changed.manufactureDt, changed.expireDt);
                supply = supply.add(changed.amounts.getSupplyAmt());
                vat = vat.add(changed.amounts.getVatAmt());
                total = total.add(changed.amounts.getTotalAmt());
            } else if (taxChanged) {
                PurchaseOrderAmountCalculator.Amounts amounts = PurchaseOrderAmountCalculator.calculate(
                        row.getArrivalQty(), row.getUnitPrice(), targetTax, targetVat, null);
                putArrivalRow(tenantId, userId, arrivalId, row, lineNo, row.getArrivalQty(), row.getUnitPrice(),
                        amounts, row.getWarehouseId(), row.getManufactureDt(), row.getExpireDt());
                supply = supply.add(amounts.getSupplyAmt());
                vat = vat.add(amounts.getVatAmt());
                total = total.add(amounts.getTotalAmt());
            } else {
                if (row.getLineNo() == null || row.getLineNo() != lineNo) {
                    Map<String, Object> renumber = tenantParams(tenantId);
                    renumber.put("purchaseArrivalId", arrivalId);
                    renumber.put("purchaseArrivalDetailId", row.getPurchaseArrivalDetailId());
                    renumber.put("lineNo", lineNo);
                    renumber.put("updatedBy", userId);
                    if (arrivalDAO.updateArrivalDetailLineNo(renumber) != 1) {
                        throw concurrentChange();
                    }
                }
                supply = supply.add(zeroIfNull(row.getSupplyAmt()));
                vat = vat.add(zeroIfNull(row.getVatAmt()));
                total = total.add(zeroIfNull(row.getTotalAmt()));
            }
        }
        if (total.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("합계금액이 허용 범위를 초과했습니다.");
        }
        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("purchaseArrivalId", arrivalId);
        hd.put("arrivalDt", arrival.getArrivalDt());
        hd.put("taxType", targetTax);
        hd.put("vatIncludedAt", targetVat ? "Y" : "N");
        hd.put("supplyAmt", supply);
        hd.put("vatAmt", vat);
        hd.put("totalAmt", total);
        hd.put("remark", arrival.getRemark());
        hd.put("updatedBy", userId);
        if (arrivalDAO.updateArrivalHeader(hd) != 1) {
            throw concurrentChange();
        }
    }

    private void putArrivalRow(Long tenantId, String userId, Long arrivalId, PurchaseArrivalDetailVO row, int lineNo,
            BigDecimal qty, BigDecimal unitPrice, PurchaseOrderAmountCalculator.Amounts amounts, Long warehouseId,
            LocalDate manufactureDt, LocalDate expireDt) throws Exception {
        Map<String, Object> dt = tenantParams(tenantId);
        dt.put("purchaseArrivalId", arrivalId);
        dt.put("purchaseArrivalDetailId", row.getPurchaseArrivalDetailId());
        dt.put("lineNo", lineNo);
        dt.put("arrivalQty", qty);
        dt.put("unitPrice", unitPrice);
        dt.put("supplyAmt", amounts.getSupplyAmt());
        dt.put("vatAmt", amounts.getVatAmt());
        dt.put("totalAmt", amounts.getTotalAmt());
        dt.put("warehouseId", warehouseId);
        dt.put("manufactureDt", manufactureDt);
        dt.put("expireDt", expireDt);
        dt.put("remark", row.getRemark());
        dt.put("updatedBy", userId);
        if (arrivalDAO.updateArrivalDetail(dt) != 1) {
            throw concurrentChange();
        }
    }

    /**
     * 수입검사 행과 검사 헤더를 ID 순서로 잠근 뒤 같은 행을 다시 읽어 최신 입고량을 쓴다.
     * 잠금 대기 중 다른 입고가 커밋되면 첫 조회의 합계는 오래된 값일 수 있어, 잠근 뒤 새 문장으로 다시 조회한다.
     * excludeReceiptId의 입고는 입고수량 합에서 뺀다(수정 중인 입고 자신).
     */
    private Map<Long, PurchaseReceiptInspectionRowVO> lockInspectionRows(Long tenantId, TreeSet<Long> detailIds,
            Long excludeReceiptId) throws Exception {
        receiptDAO.selectInspectionRows(inspectionRowParams(tenantId, detailIds, excludeReceiptId, true));
        Map<Long, PurchaseReceiptInspectionRowVO> byId = new HashMap<Long, PurchaseReceiptInspectionRowVO>();
        for (PurchaseReceiptInspectionRowVO row : receiptDAO
                .selectInspectionRows(inspectionRowParams(tenantId, detailIds, excludeReceiptId, false))) {
            byId.put(row.getQualityInspectionDetailId(), row);
        }
        return byId;
    }

    /** 수정 대상 입고에 담긴 수입검사 행을 잠그고 읽는다. 검사 연결 행이 없으면 빈 맵이다. */
    private Map<Long, PurchaseReceiptInspectionRowVO> lockLinkedInspectionRows(Long tenantId, Long purchaseReceiptId,
            Iterable<PurchaseReceiptDetailVO> rows) throws Exception {
        TreeSet<Long> ids = new TreeSet<Long>();
        for (PurchaseReceiptDetailVO row : rows) {
            if (row.getQualityInspectionDetailId() != null) {
                ids.add(row.getQualityInspectionDetailId());
            }
        }
        if (ids.isEmpty()) {
            return new HashMap<Long, PurchaseReceiptInspectionRowVO>();
        }
        return lockInspectionRows(tenantId, ids, purchaseReceiptId);
    }

    private Map<String, Object> inspectionRowParams(Long tenantId, TreeSet<Long> detailIds, Long excludeReceiptId,
            boolean forUpdate) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(detailIds));
        if (excludeReceiptId != null) {
            params.put("excludeReceiptId", excludeReceiptId);
        }
        params.put("forUpdate", Boolean.valueOf(forUpdate));
        return params;
    }

    /** 입고수량이 입고 가능량(합격량 − 다른 유효 입고 합)을 넘으면 거부한다. */
    private void requireWithinReceivable(PurchaseReceiptInspectionRowVO source, BigDecimal receiptQty) {
        BigDecimal received = source.getReceivedQty() == null ? BigDecimal.ZERO : source.getReceivedQty();
        BigDecimal receivable = source.getPassQty().subtract(received);
        if (receiptQty.compareTo(receivable) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, source.getMaterialName() + "(검사 "
                    + source.getInspectionNo() + ")의 입고수량이 입고 가능량 "
                    + receivable.stripTrailingZeros().toPlainString() + "을(를) 초과했습니다.");
        }
    }

    private PurchaseRequestRequesterVO findReceiver(Long tenantId, String userId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("loginCode", userId);
        PurchaseRequestRequesterVO receiver = requestDAO.selectRequester(params);
        if (receiver == null || receiver.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "입고 담당자 사용자 정보를 찾을 수 없습니다.");
        }
        return receiver;
    }

    private ResponseStatusException inspectionChanged() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "입고할 수입검사 품목이 변경되었습니다. 화면을 다시 조회해 주세요.");
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

    private PreparedRow prepareRow(Long tenantId, String taxType, boolean vatIncluded,
            PurchaseReceiptDetailSaveRequestVO detail, Long defaultWarehouseId) throws Exception {
        if (detail.getReceiptQty() == null || detail.getReceiptQty().signum() <= 0) {
            throw badRequest("입고수량은 0보다 커야 합니다.");
        }
        BigDecimal receiptQty = decimal(detail.getReceiptQty(), "입고수량");
        if (detail.getUnitPrice() == null) {
            throw badRequest("입고단가를 입력해 주세요.");
        }
        if (detail.getUnitPrice().signum() < 0) {
            throw badRequest("입고단가는 0 이상이어야 합니다.");
        }
        BigDecimal unitPrice = decimal(detail.getUnitPrice(), "입고단가");
        Long warehouseId = detail.getWarehouseId() != null ? detail.getWarehouseId() : defaultWarehouseId;
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
            amounts = PurchaseOrderAmountCalculator.calculate(receiptQty, unitPrice, taxType, vatIncluded, vatOverride);
        } catch (IllegalArgumentException exception) {
            throw badRequest(exception.getMessage());
        }
        if (amounts.getTotalAmt().precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("금액이 허용 범위를 초과했습니다.");
        }
        return new PreparedRow(receiptQty, unitPrice, warehouseId, detail.getManufactureDt(), detail.getExpireDt(),
                remark, amounts);
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

    private String generateNo(Long tenantId, LocalDate dt) throws Exception {
        String dateKey = dt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(RECEIPT_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException("입고번호를 생성할 수 없습니다.");
        }
        String no = String.format(Locale.ROOT, "%s-%s-%04d", "MI", dateKey, sequence);
        if (no.length() > NO_MAX_LENGTH) {
            throw new IllegalStateException("입고번호를 생성할 수 없습니다.");
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

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
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
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "입고를 찾을 수 없습니다.");
    }

    private ResponseStatusException concurrentChange() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "입고 또는 가입고가 동시에 변경되었습니다. 다시 조회해 주세요.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    /** 입고 수정·취소가 반영될 가입고 한 건의 현재 상태와 바뀔 내용. */
    private static final class ArrivalSync {
        private PurchaseArrivalVO arrival;
        private final Map<Long, PurchaseArrivalDetailVO> rows = new LinkedHashMap<Long, PurchaseArrivalDetailVO>();
        private final Map<Long, PreparedRow> updates = new HashMap<Long, PreparedRow>();
        private final Set<Long> removed = new HashSet<Long>();
    }

    private static final class PreparedRow {
        private final BigDecimal receiptQty;
        private final BigDecimal unitPrice;
        private final Long warehouseId;
        private final LocalDate manufactureDt;
        private final LocalDate expireDt;
        private final String remark;
        private final PurchaseOrderAmountCalculator.Amounts amounts;

        private PreparedRow(BigDecimal receiptQty, BigDecimal unitPrice, Long warehouseId, LocalDate manufactureDt,
                LocalDate expireDt, String remark, PurchaseOrderAmountCalculator.Amounts amounts) {
            this.receiptQty = receiptQty;
            this.unitPrice = unitPrice;
            this.warehouseId = warehouseId;
            this.manufactureDt = manufactureDt;
            this.expireDt = expireDt;
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
