package egovframework.let.materials.order.create.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
import egovframework.let.materials.order.create.domain.model.PurchaseOrderArrivalQtyVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderCandidateVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderConfirmRowVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderMaterialDefaultVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderPrintVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseDetailVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderReceiptCloseRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderSaveRequestVO;
import egovframework.let.materials.order.create.domain.model.PurchaseOrderVO;
import egovframework.let.materials.order.create.domain.repository.PurchaseOrderDAO;
import egovframework.let.materials.order.create.service.PurchaseOrderService;
import egovframework.let.materials.request.confirm.domain.repository.PurchaseRequestConfirmDAO;
import egovframework.let.materials.request.create.domain.model.PurchaseRequestRequesterVO;
import egovframework.let.materials.request.create.domain.repository.PurchaseRequestDAO;

/**
 * 발주 검증, 채번, 직접 발주 시 구매요청·확정 자동 생성과 저장을 처리하는 서비스 구현 클래스.
 *
 * @author S-ERP
 * @since 2026.11.13
 * @version 1.0
 */
@Service("purchaseOrderService")
public class PurchaseOrderServiceImpl extends EgovAbstractServiceImpl implements PurchaseOrderService {

    static final String SOURCE_CONFIRM = "CONFIRM";
    static final String SOURCE_DIRECT = "DIRECT";
    static final String ORDER_NO_GENERATOR_KEY = "MATERIAL_ORDER_NO";
    private static final String REQUEST_NO_GENERATOR_KEY = "MATERIAL_REQUEST_NO";
    private static final String CONFIRM_NO_GENERATOR_KEY = "MATERIAL_CONFIRM_NO";
    private static final String DEFAULT_CURRENCY = "KRW";
    private static final Pattern CURRENCY_PATTERN = Pattern.compile("^[A-Z]{3}$");
    private static final int NO_MAX_LENGTH = 30;
    private static final int MAX_DETAILS = 200;
    private static final int MAX_NUMERIC_PRECISION = 15;
    private static final int SCALE = 2;
    private static final int REMARK_MAX_LENGTH = 500;
    private static final Set<String> PURCHASABLE_MATERIAL_TYPE_CODES =
            Collections.unmodifiableSet(new HashSet<String>(Arrays.asList("RAW", "SUB", "SUPPLY")));

    private final PurchaseOrderDAO orderDAO;
    private final PurchaseRequestDAO requestDAO;
    private final PurchaseRequestConfirmDAO confirmDAO;
    private final IdSequenceService idSequenceService;

    public PurchaseOrderServiceImpl(PurchaseOrderDAO orderDAO, PurchaseRequestDAO requestDAO,
            PurchaseRequestConfirmDAO confirmDAO, IdSequenceService idSequenceService) {
        this.orderDAO = orderDAO;
        this.requestDAO = requestDAO;
        this.confirmDAO = confirmDAO;
        this.idSequenceService = idSequenceService;
    }

    @Override
    public List<PurchaseOrderCandidateVO> listCandidates(Long tenantId, LocalDate fromDt, LocalDate toDt,
            String keyword) throws Exception {
        requireTenant(tenantId);
        if (fromDt != null && toDt != null && fromDt.isAfter(toDt)) {
            throw badRequest("확정일 시작일은 종료일보다 늦을 수 없습니다.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("fromDt", fromDt);
        params.put("toDt", toDt);
        params.put("keyword", normalize(keyword));
        return orderDAO.selectCandidates(params);
    }

    @Override
    public PurchaseOrderMaterialDefaultVO getMaterialDefault(Long tenantId, Long materialId) throws Exception {
        requireTenant(tenantId);
        if (materialId == null || materialId < 1L) {
            throw badRequest("품목을 선택해 주세요.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("materialId", materialId);
        PurchaseOrderMaterialDefaultVO material = orderDAO.selectMaterialDefault(params);
        if (material == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
        }
        return material;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseOrderVO createOrder(Long tenantId, String userId, PurchaseOrderSaveRequestVO payload)
            throws Exception {
        requirePrincipal(tenantId, userId);
        Header header = validateHeader(tenantId, payload);
        List<PreparedRow> rows = SOURCE_CONFIRM.equals(header.sourceType)
                ? prepareConfirmRows(tenantId, payload, header)
                : prepareDirectRows(tenantId, payload, header);

        PurchaseRequestRequesterVO orderer = findOrderer(tenantId, userId);
        BigDecimal supplyTotal = BigDecimal.ZERO.setScale(SCALE);
        BigDecimal vatTotal = BigDecimal.ZERO.setScale(SCALE);
        BigDecimal totalTotal = BigDecimal.ZERO.setScale(SCALE);
        for (PreparedRow row : rows) {
            supplyTotal = supplyTotal.add(row.amounts.getSupplyAmt());
            vatTotal = vatTotal.add(row.amounts.getVatAmt());
            totalTotal = totalTotal.add(row.amounts.getTotalAmt());
        }
        if (totalTotal.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("합계금액이 허용 범위를 초과했습니다.");
        }

        String orderNo = generateNo(ORDER_NO_GENERATOR_KEY, "PO", tenantId, header.orderDt, "발주번호");
        if (SOURCE_DIRECT.equals(header.sourceType)) {
            createAutoRequestAndConfirm(tenantId, userId, orderer, orderNo, header, rows);
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("orderNo", orderNo);
        hd.put("orderDt", header.orderDt);
        hd.put("supplierId", header.supplierId);
        hd.put("ordererId", orderer.getUserId());
        hd.put("orderDeptId", orderer.getDepartmentId());
        hd.put("currencyCode", header.currencyCode);
        hd.put("sourceType", header.sourceType);
        hd.put("taxType", header.taxType);
        hd.put("vatIncludedAt", header.vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", supplyTotal);
        hd.put("vatAmt", vatTotal);
        hd.put("totalAmt", totalTotal);
        hd.put("remark", header.remark);
        hd.put("createdBy", userId);
        Long purchaseOrderId = orderDAO.insertOrderHeader(hd);
        if (purchaseOrderId == null || purchaseOrderId < 1L) {
            throw new IllegalStateException("발주 헤더 저장에 실패했습니다.");
        }

        int lineNo = 1;
        for (PreparedRow row : rows) {
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("purchaseOrderId", purchaseOrderId);
            dt.put("lineNo", lineNo++);
            dt.put("purchaseRequestDetailId", row.purchaseRequestDetailId);
            dt.put("materialId", row.materialId);
            dt.put("orderQty", row.orderQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("deliveryDt", row.deliveryDt);
            dt.put("warehouseId", row.warehouseId);
            dt.put("orderType", row.orderType);
            dt.put("useType", row.useType);
            dt.put("inspectAt", row.inspectAt);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("remark", row.remark);
            dt.put("createdBy", userId);
            Long detailId = orderDAO.insertOrderDetail(dt);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("발주 상세 저장에 실패했습니다.");
            }
        }

        PurchaseOrderVO saved = getOrder(tenantId, purchaseOrderId);
        saved.setOverOrderedLineNos(findOverOrderedLines(tenantId, rows));
        return saved;
    }

    @Override
    public PurchaseOrderVO getOrder(Long tenantId, Long purchaseOrderId) throws Exception {
        requireTenant(tenantId);
        if (purchaseOrderId == null || purchaseOrderId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseOrderId", purchaseOrderId);
        PurchaseOrderVO order = orderDAO.selectOrder(params);
        if (order == null) {
            throw notFound();
        }
        List<PurchaseOrderDetailVO> details = orderDAO.selectOrderDetails(params);
        List<Long> detailIds = new ArrayList<Long>();
        for (PurchaseOrderDetailVO detail : details) {
            detailIds.add(detail.getPurchaseOrderDetailId());
        }
        // 화면이 가입고가 있는 행(수정 불가)을 알 수 있도록 행별 가입고수량을 채운다.
        Map<Long, BigDecimal> arrivedById = selectArrivedQtys(tenantId, detailIds);
        for (PurchaseOrderDetailVO detail : details) {
            BigDecimal arrived = arrivedById.get(detail.getPurchaseOrderDetailId());
            detail.setArrivedQty(arrived == null ? BigDecimal.ZERO : arrived);
        }
        order.setDetails(details);
        return order;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseOrderVO updateOrder(Long tenantId, String userId, Long purchaseOrderId,
            PurchaseOrderSaveRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        PurchaseOrderVO locked = lockActiveOrder(tenantId, purchaseOrderId, "취소된 발주는 수정할 수 없습니다.");
        if (payload == null || payload.getOrderDt() == null) {
            throw badRequest("발주일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("모든 행을 뺄 수 없습니다. 발주 취소를 사용해 주세요.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? locked.getTaxType() : taxType;
        if (!orderDAO.existsTaxType(referenceParams(tenantId, "code", taxType))) {
            throw badRequest("사용할 수 없는 부가세구분입니다.");
        }
        String vatIncludedAt = normalize(payload.getVatIncludedAt());
        vatIncludedAt = vatIncludedAt == null ? "N" : vatIncludedAt;
        if (!"Y".equals(vatIncludedAt) && !"N".equals(vatIncludedAt)) {
            throw badRequest("부가세 포함 여부는 Y 또는 N이어야 합니다.");
        }
        boolean vatIncluded = "Y".equals(vatIncludedAt);
        if (vatIncluded && !PurchaseOrderAmountCalculator.TAXABLE.equals(taxType)) {
            throw badRequest("영세·면세는 부가세 포함을 선택할 수 없습니다.");
        }
        String remark = normalize(payload.getRemark());
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }

        Map<String, Object> orderParams = tenantParams(tenantId);
        orderParams.put("purchaseOrderId", purchaseOrderId);
        Map<Long, PurchaseOrderDetailVO> existingById = new LinkedHashMap<Long, PurchaseOrderDetailVO>();
        for (PurchaseOrderDetailVO existing : orderDAO.selectOrderDetails(orderParams)) {
            existingById.put(existing.getPurchaseOrderDetailId(), existing);
        }
        Map<Long, PurchaseOrderDetailSaveRequestVO> requestedById = new HashMap<Long, PurchaseOrderDetailSaveRequestVO>();
        for (PurchaseOrderDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseOrderDetailId() == null
                    || !existingById.containsKey(detail.getPurchaseOrderDetailId())
                    || requestedById.put(detail.getPurchaseOrderDetailId(), detail) != null) {
                throw badRequest("발주 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
        }
        // 가입고가 있는 행은 삭제할 수 없다. 수량 축소·검사대상 변경은 값 검증 뒤에 확인한다.
        Map<Long, BigDecimal> arrivedById = selectArrivedQtys(tenantId, existingById.keySet());
        for (PurchaseOrderDetailVO existing : existingById.values()) {
            if (arrivedById.containsKey(existing.getPurchaseOrderDetailId())
                    && !requestedById.containsKey(existing.getPurchaseOrderDetailId())) {
                throw arrivalConflict("가입고가 있는 행은 삭제할 수 없습니다.");
            }
        }

        // 가입고가 하나라도 있으면 발주일·부가세 설정(잠긴 행의 금액에 영향)을 바꿀 수 없고 비고만 수정할 수 있다.
        if (!arrivedById.isEmpty()
                && (!payload.getOrderDt().equals(locked.getOrderDt())
                        || !taxType.equals(locked.getTaxType())
                        || !vatIncludedAt.equals(locked.getVatIncludedAt() == null ? "N" : locked.getVatIncludedAt()))) {
            throw arrivalConflict("가입고가 있는 발주는 발주일·부가세 설정을 바꿀 수 없습니다. 비고만 수정할 수 있습니다.");
        }

        boolean direct = SOURCE_DIRECT.equals(locked.getSourceType());
        List<Long> requestDetailIds = new ArrayList<Long>();
        for (PurchaseOrderDetailVO existing : existingById.values()) {
            requestDetailIds.add(existing.getPurchaseRequestDetailId());
        }
        Map<String, Object> lockParams = tenantParams(tenantId);
        lockParams.put("detailIds", new ArrayList<Long>(new TreeSet<Long>(requestDetailIds)));
        lockParams.put("forUpdate", Boolean.TRUE);
        Set<Long> confirmIds = new TreeSet<Long>();
        for (PurchaseOrderConfirmRowVO confirmRow : orderDAO.selectConfirmRows(lockParams)) {
            if (confirmRow.getPurchaseConfirmId() != null) {
                confirmIds.add(confirmRow.getPurchaseConfirmId());
            }
        }
        Set<Long> requestIds = new TreeSet<Long>();
        if (direct) {
            Map<String, Object> idParams = tenantParams(tenantId);
            idParams.put("detailIds", new ArrayList<Long>(new TreeSet<Long>(requestDetailIds)));
            for (egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO lockRow
                    : confirmDAO.selectDetailLocks(idParams)) {
                requestIds.add(lockRow.getPurchaseRequestId());
            }
        }

        Header header = new Header(locked.getSourceType(), payload.getOrderDt(), locked.getSupplierId(),
                locked.getCurrencyCode(), taxType, vatIncluded, remark, null, null, null);
        List<PurchaseOrderDetailVO> keptExisting = new ArrayList<PurchaseOrderDetailVO>();
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        for (PurchaseOrderDetailVO existing : existingById.values()) {
            PurchaseOrderDetailSaveRequestVO detail = requestedById.get(existing.getPurchaseOrderDetailId());
            if (detail == null) {
                continue;
            }
            String inspectAt = normalize(detail.getInspectAt());
            PreparedRow preparedRow = prepareRow(tenantId, header, detail, existing.getPurchaseRequestDetailId(),
                    existing.getMaterialId(), existing.getOrderType(), existing.getUseType(),
                    inspectAt == null ? existing.getInspectAt() : inspectAt,
                    existing.getWarehouseId(), existing.getDeliveryDt());
            BigDecimal arrived = arrivedById.get(existing.getPurchaseOrderDetailId());
            if (arrived != null && changesLockedRow(existing, preparedRow)) {
                throw arrivalConflict("가입고가 있는 행(" + existing.getLineNo()
                        + "행)은 수량·단가·납기·창고·검사대상을 바꿀 수 없습니다. 가입고를 먼저 취소해 주세요.");
            }
            prepared.add(preparedRow);
            keptExisting.add(existing);
        }
        BigDecimal supplyTotal = BigDecimal.ZERO.setScale(SCALE);
        BigDecimal vatTotal = BigDecimal.ZERO.setScale(SCALE);
        BigDecimal totalTotal = BigDecimal.ZERO.setScale(SCALE);
        for (PreparedRow row : prepared) {
            supplyTotal = supplyTotal.add(row.amounts.getSupplyAmt());
            vatTotal = vatTotal.add(row.amounts.getVatAmt());
            totalTotal = totalTotal.add(row.amounts.getTotalAmt());
        }
        if (totalTotal.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("합계금액이 허용 범위를 초과했습니다.");
        }

        // 행번호 유일 제약 때문에 삭제를 먼저 하고, 남은 행은 기존 행번호 오름차순으로 다시 매긴다.
        for (PurchaseOrderDetailVO existing : existingById.values()) {
            if (requestedById.containsKey(existing.getPurchaseOrderDetailId())) {
                continue;
            }
            Map<String, Object> deleteParams = tenantParams(tenantId);
            deleteParams.put("purchaseOrderId", purchaseOrderId);
            deleteParams.put("purchaseOrderDetailId", existing.getPurchaseOrderDetailId());
            if (orderDAO.deleteOrderDetail(deleteParams) != 1) {
                throw concurrentChange();
            }
            if (direct) {
                Map<String, Object> requestParams = tenantParams(tenantId);
                requestParams.put("purchaseRequestDetailId", existing.getPurchaseRequestDetailId());
                orderDAO.deleteAutoRequestDetail(requestParams);
            }
        }
        for (int index = 0; index < prepared.size(); index++) {
            PreparedRow row = prepared.get(index);
            Map<String, Object> dt = tenantParams(tenantId);
            dt.put("purchaseOrderId", purchaseOrderId);
            dt.put("purchaseOrderDetailId", keptExisting.get(index).getPurchaseOrderDetailId());
            dt.put("lineNo", index + 1);
            dt.put("orderQty", row.orderQty);
            dt.put("unitPrice", row.unitPrice);
            dt.put("deliveryDt", row.deliveryDt);
            dt.put("warehouseId", row.warehouseId);
            dt.put("inspectAt", row.inspectAt);
            dt.put("supplyAmt", row.amounts.getSupplyAmt());
            dt.put("vatAmt", row.amounts.getVatAmt());
            dt.put("totalAmt", row.amounts.getTotalAmt());
            dt.put("remark", row.remark);
            dt.put("updatedBy", userId);
            if (orderDAO.updateOrderDetail(dt) != 1) {
                throw concurrentChange();
            }
            if (direct) {
                BigDecimal amount = row.unitPrice == null ? BigDecimal.ZERO.setScale(SCALE)
                        : row.orderQty.multiply(row.unitPrice).setScale(SCALE, RoundingMode.HALF_UP);
                Map<String, Object> requestParams = tenantParams(tenantId);
                requestParams.put("purchaseRequestDetailId", row.purchaseRequestDetailId);
                requestParams.put("orderQty", row.orderQty);
                requestParams.put("deliveryDt", row.deliveryDt);
                requestParams.put("warehouseId", row.warehouseId);
                requestParams.put("unitPrice", row.unitPrice);
                requestParams.put("amount", amount);
                requestParams.put("updatedBy", userId);
                orderDAO.updateAutoRequestDetail(requestParams);
            }
        }

        Map<String, Object> hd = tenantParams(tenantId);
        hd.put("purchaseOrderId", purchaseOrderId);
        hd.put("orderDt", header.orderDt);
        hd.put("taxType", taxType);
        hd.put("vatIncludedAt", vatIncluded ? "Y" : "N");
        hd.put("supplyAmt", supplyTotal);
        hd.put("vatAmt", vatTotal);
        hd.put("totalAmt", totalTotal);
        hd.put("remark", remark);
        hd.put("updatedBy", userId);
        if (orderDAO.updateOrderHeader(hd) != 1) {
            throw concurrentChange();
        }
        if (direct) {
            for (Long confirmId : confirmIds) {
                Map<String, Object> totalParams = tenantParams(tenantId);
                totalParams.put("purchaseConfirmId", confirmId);
                totalParams.put("updatedBy", userId);
                orderDAO.refreshConfirmTotal(totalParams);
            }
            Map<String, Object> refresh = tenantParams(tenantId);
            refresh.put("purchaseRequestIds", new ArrayList<Long>(requestIds));
            refresh.put("updatedBy", userId);
            confirmDAO.refreshRequestStatuses(refresh);
        }

        PurchaseOrderVO saved = getOrder(tenantId, purchaseOrderId);
        saved.setOverOrderedLineNos(findOverOrderedLines(tenantId, prepared));
        return saved;
    }

    @Override
    public PurchaseOrderPrintVO getPrintData(Long tenantId, Long purchaseOrderId) throws Exception {
        requireTenant(tenantId);
        if (purchaseOrderId == null || purchaseOrderId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseOrderId", purchaseOrderId);
        PurchaseOrderPrintVO print = orderDAO.selectOrderPrint(params);
        if (print == null) {
            throw notFound();
        }
        if (!"Y".equals(print.getUseAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 발주는 출력할 수 없습니다.");
        }
        print.setDetails(orderDAO.selectOrderPrintDetails(params));
        return print;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseOrderVO markPrinted(Long tenantId, String userId, Long purchaseOrderId) throws Exception {
        requirePrincipal(tenantId, userId);
        lockActiveOrder(tenantId, purchaseOrderId, "취소된 발주는 출력할 수 없습니다.");
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseOrderId", purchaseOrderId);
        params.put("printedBy", userId);
        if (orderDAO.updatePrintMark(params) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 발주는 출력할 수 없습니다.");
        }
        return getOrder(tenantId, purchaseOrderId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseOrderVO saveReceiptClose(Long tenantId, String userId, Long purchaseOrderId,
            PurchaseOrderReceiptCloseRequestVO payload) throws Exception {
        requirePrincipal(tenantId, userId);
        lockActiveOrder(tenantId, purchaseOrderId, "취소된 발주는 마감을 바꿀 수 없습니다.");
        if (payload == null || payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("입고대기 마감을 변경할 상세 행이 없습니다.");
        }
        Map<String, Object> orderParams = tenantParams(tenantId);
        orderParams.put("purchaseOrderId", purchaseOrderId);
        Set<Long> storedIds = new HashSet<Long>();
        for (PurchaseOrderDetailVO existing : orderDAO.selectOrderDetails(orderParams)) {
            storedIds.add(existing.getPurchaseOrderDetailId());
        }
        Set<Long> seen = new HashSet<Long>();
        for (PurchaseOrderReceiptCloseDetailVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseOrderDetailId() == null
                    || !storedIds.contains(detail.getPurchaseOrderDetailId())
                    || !seen.add(detail.getPurchaseOrderDetailId())) {
                throw badRequest("발주 상세 정보가 올바르지 않습니다. 화면을 다시 조회해 주세요.");
            }
            String closeAt = normalize(detail.getReceiptCloseAt());
            if (!"Y".equals(closeAt) && !"N".equals(closeAt)) {
                throw badRequest("입고대기 마감 값은 Y 또는 N이어야 합니다.");
            }
        }
        for (PurchaseOrderReceiptCloseDetailVO detail : payload.getDetails()) {
            Map<String, Object> values = tenantParams(tenantId);
            values.put("purchaseOrderId", purchaseOrderId);
            values.put("purchaseOrderDetailId", detail.getPurchaseOrderDetailId());
            values.put("receiptCloseAt", detail.getReceiptCloseAt().trim());
            values.put("updatedBy", userId);
            orderDAO.updateReceiptClose(values);
        }
        return getOrder(tenantId, purchaseOrderId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PurchaseOrderVO cancelOrder(Long tenantId, String userId, Long purchaseOrderId) throws Exception {
        requirePrincipal(tenantId, userId);
        PurchaseOrderVO locked = lockActiveOrder(tenantId, purchaseOrderId, "이미 취소된 발주입니다.");
        Map<String, Object> orderParams = tenantParams(tenantId);
        orderParams.put("purchaseOrderId", purchaseOrderId);
        List<PurchaseOrderDetailVO> details = orderDAO.selectOrderDetails(orderParams);
        List<Long> detailIds = new ArrayList<Long>();
        for (PurchaseOrderDetailVO detail : details) {
            detailIds.add(detail.getPurchaseOrderDetailId());
        }
        if (!selectArrivedQtys(tenantId, detailIds).isEmpty()) {
            throw arrivalConflict("가입고가 있는 발주는 취소할 수 없습니다.");
        }

        Map<String, Object> cancelParams = tenantParams(tenantId);
        cancelParams.put("purchaseOrderId", purchaseOrderId);
        cancelParams.put("updatedBy", userId);
        if (orderDAO.cancelOrderHeader(cancelParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 발주입니다.");
        }
        // 확정 불러오기 발주는 여기서 끝난다. 확정 행의 잔량은 유효한 발주 합으로 계산하므로 자동으로 되살아난다.
        if (SOURCE_DIRECT.equals(locked.getSourceType())) {
            cancelAutoRequestAndConfirm(tenantId, userId, details);
        }
        return getOrder(tenantId, purchaseOrderId);
    }

    /** 직접 발주가 자동 생성한 확정(MC)을 취소하고 구매요청(MR)을 삭제 처리한다. */
    private void cancelAutoRequestAndConfirm(Long tenantId, String userId, List<PurchaseOrderDetailVO> details)
            throws Exception {
        Set<Long> requestDetailIds = new TreeSet<Long>();
        for (PurchaseOrderDetailVO detail : details) {
            requestDetailIds.add(detail.getPurchaseRequestDetailId());
        }
        if (requestDetailIds.isEmpty()) {
            return;
        }
        Map<String, Object> lockParams = tenantParams(tenantId);
        lockParams.put("detailIds", new ArrayList<Long>(requestDetailIds));
        lockParams.put("forUpdate", Boolean.TRUE);
        Set<Long> confirmIds = new TreeSet<Long>();
        for (PurchaseOrderConfirmRowVO confirmRow : orderDAO.selectConfirmRows(lockParams)) {
            if (confirmRow.getPurchaseConfirmId() != null) {
                confirmIds.add(confirmRow.getPurchaseConfirmId());
            }
        }
        Map<String, Object> idParams = tenantParams(tenantId);
        idParams.put("detailIds", new ArrayList<Long>(requestDetailIds));
        Set<Long> requestIds = new TreeSet<Long>();
        for (egovframework.let.materials.request.confirm.domain.model.PurchaseRequestDetailLockVO lockRow
                : confirmDAO.selectDetailLocks(idParams)) {
            requestIds.add(lockRow.getPurchaseRequestId());
        }
        for (Long confirmId : confirmIds) {
            Map<String, Object> confirmParams = tenantParams(tenantId);
            confirmParams.put("purchaseConfirmId", confirmId);
            confirmParams.put("updatedBy", userId);
            confirmDAO.clearDetailsByConfirm(confirmParams);
            confirmDAO.cancelConfirmHeader(confirmParams);
        }
        Map<String, Object> refresh = tenantParams(tenantId);
        refresh.put("purchaseRequestIds", new ArrayList<Long>(requestIds));
        refresh.put("updatedBy", userId);
        confirmDAO.refreshRequestStatuses(refresh);
        for (Long requestId : requestIds) {
            Map<String, Object> deleteParams = tenantParams(tenantId);
            deleteParams.put("purchaseRequestId", requestId);
            deleteParams.put("updatedBy", userId);
            requestDAO.softDeleteRequestHeader(deleteParams);
        }
    }

    private PurchaseOrderVO lockActiveOrder(Long tenantId, Long purchaseOrderId, String canceledMessage)
            throws Exception {
        if (purchaseOrderId == null || purchaseOrderId < 1L) {
            throw notFound();
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("purchaseOrderId", purchaseOrderId);
        PurchaseOrderVO locked = orderDAO.selectOrderForUpdate(params);
        if (locked == null) {
            throw notFound();
        }
        if (!"Y".equals(locked.getUseAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, canceledMessage);
        }
        return locked;
    }

    /** 발주 행별 유효한 가입고 수량 합(가입고가 있는 행만, 합 > 0). */
    private Map<Long, BigDecimal> selectArrivedQtys(Long tenantId, Collection<Long> orderDetailIds)
            throws Exception {
        Map<Long, BigDecimal> arrived = new HashMap<Long, BigDecimal>();
        if (orderDetailIds.isEmpty()) {
            return arrived;
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(new TreeSet<Long>(orderDetailIds)));
        for (PurchaseOrderArrivalQtyVO row : orderDAO.selectArrivedQtyByOrderDetail(params)) {
            if (row.getArrivedQty() != null && row.getArrivedQty().signum() > 0) {
                arrived.put(row.getPurchaseOrderDetailId(), row.getArrivedQty());
            }
        }
        return arrived;
    }

    private ResponseStatusException arrivalConflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    /** 가입고가 있는 행의 값(수량·단가·납기·창고·검사대상·금액)이 저장된 값과 달라지는지 확인한다. 행 비고는 제외한다. */
    private boolean changesLockedRow(PurchaseOrderDetailVO existing, PreparedRow row) {
        if (!sameNumber(existing.getOrderQty(), row.orderQty)
                || !sameNumber(existing.getUnitPrice(), row.unitPrice)
                || !Objects.equals(existing.getDeliveryDt(), row.deliveryDt)
                || !Objects.equals(existing.getWarehouseId(), row.warehouseId)
                || !Objects.equals(existing.getInspectAt(), row.inspectAt)) {
            return true;
        }
        return (existing.getSupplyAmt() != null && !sameNumber(existing.getSupplyAmt(), row.amounts.getSupplyAmt()))
                || (existing.getVatAmt() != null && !sameNumber(existing.getVatAmt(), row.amounts.getVatAmt()))
                || (existing.getTotalAmt() != null && !sameNumber(existing.getTotalAmt(), row.amounts.getTotalAmt()));
    }

    private boolean sameNumber(BigDecimal stored, BigDecimal requested) {
        if (stored == null || requested == null) {
            return stored == requested;
        }
        return stored.compareTo(requested) == 0;
    }

    private ResponseStatusException concurrentChange() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "발주 상세가 동시에 변경되었습니다. 다시 조회해 주세요.");
    }

    private Header validateHeader(Long tenantId, PurchaseOrderSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getOrderDt() == null) {
            throw badRequest("발주일을 입력해 주세요.");
        }
        if (payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("발주할 품목을 입력해 주세요.");
        }
        if (payload.getDetails().size() > MAX_DETAILS) {
            throw badRequest("한 번에 발주할 수 있는 품목은 " + MAX_DETAILS + "행까지입니다.");
        }
        String sourceType = normalize(payload.getSourceType());
        if (!SOURCE_CONFIRM.equals(sourceType) && !SOURCE_DIRECT.equals(sourceType)) {
            throw badRequest("발주 출처가 올바르지 않습니다.");
        }
        if (payload.getSupplierId() == null
                || !confirmDAO.existsSupplier(referenceParams(tenantId, "id", payload.getSupplierId()))) {
            throw badRequest("사용할 수 없는 구매처입니다.");
        }
        String taxType = normalize(payload.getTaxType());
        taxType = taxType == null ? PurchaseOrderAmountCalculator.TAXABLE : taxType;
        if (!orderDAO.existsTaxType(referenceParams(tenantId, "code", taxType))) {
            throw badRequest("사용할 수 없는 부가세구분입니다.");
        }
        String vatIncludedAt = normalize(payload.getVatIncludedAt());
        vatIncludedAt = vatIncludedAt == null ? "N" : vatIncludedAt;
        if (!"Y".equals(vatIncludedAt) && !"N".equals(vatIncludedAt)) {
            throw badRequest("부가세 포함 여부는 Y 또는 N이어야 합니다.");
        }
        boolean vatIncluded = "Y".equals(vatIncludedAt);
        if (vatIncluded && !PurchaseOrderAmountCalculator.TAXABLE.equals(taxType)) {
            throw badRequest("영세·면세는 부가세 포함을 선택할 수 없습니다.");
        }
        String currencyCode = normalize(payload.getCurrencyCode());
        if (currencyCode != null && !CURRENCY_PATTERN.matcher(currencyCode).matches()) {
            throw badRequest("통화 코드가 올바르지 않습니다.");
        }
        String remark = normalize(payload.getRemark());
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        if (payload.getWarehouseId() != null
                && !confirmDAO.existsWarehouse(referenceParams(tenantId, "id", payload.getWarehouseId()))) {
            throw badRequest("사용할 수 없는 입고창고입니다.");
        }
        return new Header(sourceType, payload.getOrderDt(), payload.getSupplierId(), currencyCode, taxType,
                vatIncluded, remark, normalize(payload.getOrderType()), normalize(payload.getUseType()),
                payload.getWarehouseId());
    }

    private List<PreparedRow> prepareConfirmRows(Long tenantId, PurchaseOrderSaveRequestVO payload, Header header)
            throws Exception {
        Set<Long> unique = new TreeSet<Long>();
        for (PurchaseOrderDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseRequestDetailId() == null) {
                throw badRequest("확정 품목과 직접 선택한 품목은 한 발주서에 함께 담을 수 없습니다.");
            }
            if (!unique.add(detail.getPurchaseRequestDetailId())) {
                throw badRequest("같은 확정 품목을 중복해서 발주할 수 없습니다.");
            }
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(unique));
        params.put("forUpdate", Boolean.TRUE);
        Map<Long, PurchaseOrderConfirmRowVO> confirmRows = new HashMap<Long, PurchaseOrderConfirmRowVO>();
        for (PurchaseOrderConfirmRowVO row : orderDAO.selectConfirmRows(params)) {
            confirmRows.put(row.getPurchaseRequestDetailId(), row);
        }
        if (confirmRows.size() != unique.size()) {
            throw itemsChanged();
        }
        String currencyCode = header.currencyCode;
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        for (PurchaseOrderDetailSaveRequestVO detail : payload.getDetails()) {
            PurchaseOrderConfirmRowVO confirmRow = confirmRows.get(detail.getPurchaseRequestDetailId());
            if (confirmRow.getPurchaseConfirmId() == null || !"Y".equals(confirmRow.getConfirmUseAt())
                    || !"N".equals(confirmRow.getOrderCloseAt())) {
                throw itemsChanged();
            }
            // 저장 전에 이미 확정수량이 모두 발주된 행은 담을 수 없다(동시 등록 시 나중 요청을 막는다).
            // 잔량이 남은 행에 잔량보다 많이 주문하는 것은 허용하고 저장 후 경고만 한다.
            if (confirmRow.getConfirmQty() != null && confirmRow.getOrderedQty() != null
                    && confirmRow.getOrderedQty().compareTo(confirmRow.getConfirmQty()) >= 0) {
                throw itemsChanged();
            }
            String rowCurrency =confirmRow.getCurrencyCode() == null ? DEFAULT_CURRENCY : confirmRow.getCurrencyCode();
            if (currencyCode == null) {
                currencyCode = rowCurrency;
            } else if (!currencyCode.equals(rowCurrency)) {
                throw badRequest("통화가 다른 확정 품목은 함께 발주할 수 없습니다.");
            }
            String inspectAt = normalize(detail.getInspectAt());
            prepared.add(prepareRow(tenantId, header, detail, detail.getPurchaseRequestDetailId(),
                    confirmRow.getMaterialId(), confirmRow.getOrderType(), confirmRow.getUseType(),
                    inspectAt == null ? confirmRow.getInspectAt() : inspectAt,
                    confirmRow.getWarehouseId(), confirmRow.getConfirmDeliveryDt()));
        }
        header.currencyCode = currencyCode == null ? DEFAULT_CURRENCY : currencyCode;
        return prepared;
    }

    private List<PreparedRow> prepareDirectRows(Long tenantId, PurchaseOrderSaveRequestVO payload, Header header)
            throws Exception {
        if (header.orderType == null) {
            throw badRequest("발주구분을 선택해 주세요.");
        }
        if (header.useType == null) {
            throw badRequest("사용용도를 선택해 주세요.");
        }
        if (!confirmDAO.existsOrderType(referenceParams(tenantId, "code", header.orderType))) {
            throw badRequest("사용할 수 없는 발주구분입니다.");
        }
        if (!requestDAO.existsUseType(referenceParams(tenantId, "code", header.useType))) {
            throw badRequest("사용할 수 없는 사용용도입니다.");
        }
        header.currencyCode = header.currencyCode == null ? DEFAULT_CURRENCY : header.currencyCode;
        List<PreparedRow> prepared = new ArrayList<PreparedRow>();
        for (PurchaseOrderDetailSaveRequestVO detail : payload.getDetails()) {
            if (detail == null || detail.getPurchaseRequestDetailId() != null) {
                throw badRequest("확정 품목과 직접 선택한 품목은 한 발주서에 함께 담을 수 없습니다.");
            }
            if (detail.getMaterialId() == null || detail.getMaterialId() < 1L) {
                throw badRequest("품목을 선택해 주세요.");
            }
            Map<String, Object> materialParams = tenantParams(tenantId);
            materialParams.put("materialId", detail.getMaterialId());
            PurchaseOrderMaterialDefaultVO material = orderDAO.selectMaterialDefault(materialParams);
            if (material == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "품목을 찾을 수 없습니다.");
            }
            if (material.getMaterialTypeCode() == null
                    || !PURCHASABLE_MATERIAL_TYPE_CODES.contains(material.getMaterialTypeCode().trim())) {
                throw badRequest("발주할 수 없는 품목계정입니다. 원재료, 부재료, 소모품만 선택할 수 있습니다.");
            }
            String inspectAt = normalize(detail.getInspectAt());
            prepared.add(prepareRow(tenantId, header, detail, null, detail.getMaterialId(), header.orderType,
                    header.useType, inspectAt == null ? material.getInspectAt() : inspectAt,
                    null, null));
        }
        return prepared;
    }

    private PreparedRow prepareRow(Long tenantId, Header header, PurchaseOrderDetailSaveRequestVO detail,
            Long purchaseRequestDetailId, Long materialId, String orderType, String useType, String inspectAt,
            Long defaultWarehouseId, LocalDate defaultDeliveryDt) throws Exception {
        if (detail.getOrderQty() == null || detail.getOrderQty().signum() <= 0) {
            throw badRequest("발주수량은 0보다 커야 합니다.");
        }
        BigDecimal orderQty = decimal(detail.getOrderQty(), "발주수량");
        BigDecimal unitPrice = null;
        if (detail.getUnitPrice() != null) {
            if (detail.getUnitPrice().signum() < 0) {
                throw badRequest("단가는 0 이상이어야 합니다.");
            }
            unitPrice = decimal(detail.getUnitPrice(), "단가");
        }
        LocalDate deliveryDt = detail.getDeliveryDt() != null ? detail.getDeliveryDt() : defaultDeliveryDt;
        if (deliveryDt == null) {
            throw badRequest("납기일을 입력해 주세요.");
        }
        Long warehouseId = detail.getWarehouseId() != null ? detail.getWarehouseId()
                : header.warehouseId != null ? header.warehouseId : defaultWarehouseId;
        if (warehouseId == null) {
            throw badRequest("입고창고를 선택해 주세요.");
        }
        if (!confirmDAO.existsWarehouse(referenceParams(tenantId, "id", warehouseId))) {
            throw badRequest("사용할 수 없는 입고창고입니다.");
        }
        if (!"Y".equals(inspectAt) && !"N".equals(inspectAt)) {
            throw badRequest("검사대상은 Y 또는 N이어야 합니다.");
        }
        String remark = normalize(detail.getRemark());
        if (remark != null && remark.length() > REMARK_MAX_LENGTH) {
            throw badRequest("비고는 " + REMARK_MAX_LENGTH + "자 이내로 입력해 주세요.");
        }
        BigDecimal vatOverride = detail.getVatAmt() == null ? null : decimal(detail.getVatAmt(), "세액");
        PurchaseOrderAmountCalculator.Amounts amounts;
        try {
            amounts = PurchaseOrderAmountCalculator.calculate(orderQty, unitPrice, header.taxType,
                    header.vatIncluded, vatOverride);
        } catch (IllegalArgumentException exception) {
            throw badRequest(exception.getMessage());
        }
        if (amounts.getTotalAmt().precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("금액이 허용 범위를 초과했습니다.");
        }
        return new PreparedRow(purchaseRequestDetailId, materialId, orderQty, unitPrice, deliveryDt, warehouseId,
                orderType, useType, inspectAt, remark, amounts);
    }

    /** 직접 발주: 같은 트랜잭션에서 구매요청 1건과 확정 1건을 만들고 각 행에 상세 ID를 채운다. */
    private void createAutoRequestAndConfirm(Long tenantId, String userId, PurchaseRequestRequesterVO requester,
            String orderNo, Header header, List<PreparedRow> rows) throws Exception {
        String autoRemark = "직접 발주 자동 생성 (" + orderNo + ")";
        Map<String, Object> requestHeader = tenantParams(tenantId);
        requestHeader.put("requestNo", generateNo(REQUEST_NO_GENERATOR_KEY, "MR", tenantId, header.orderDt, "구매요청번호"));
        requestHeader.put("requestDt", header.orderDt);
        requestHeader.put("requesterId", requester.getUserId());
        requestHeader.put("requestDeptId", requester.getDepartmentId());
        requestHeader.put("status", "REQUESTED");
        requestHeader.put("remark", autoRemark);
        requestHeader.put("createdBy", userId);
        Long purchaseRequestId = requestDAO.insertRequestHeader(requestHeader);
        if (purchaseRequestId == null || purchaseRequestId < 1L) {
            throw new IllegalStateException("구매요청 자동 생성에 실패했습니다.");
        }
        int lineNo = 1;
        for (PreparedRow row : rows) {
            Map<String, Object> detail = tenantParams(tenantId);
            detail.put("purchaseRequestId", purchaseRequestId);
            detail.put("lineNo", lineNo++);
            detail.put("materialId", row.materialId);
            detail.put("requestQty", row.orderQty);
            detail.put("requestDeliveryDt", row.deliveryDt);
            detail.put("useType", row.useType);
            detail.put("requestRemark", null);
            detail.put("createdBy", userId);
            Long detailId = requestDAO.insertRequestDetail(detail);
            if (detailId == null || detailId < 1L) {
                throw new IllegalStateException("구매요청 상세 자동 생성에 실패했습니다.");
            }
            row.purchaseRequestDetailId = detailId;
        }

        BigDecimal confirmTotal = BigDecimal.ZERO.setScale(SCALE);
        Map<PreparedRow, BigDecimal> amountByRow = new LinkedHashMap<PreparedRow, BigDecimal>();
        for (PreparedRow row : rows) {
            BigDecimal amount = row.unitPrice == null ? BigDecimal.ZERO.setScale(SCALE)
                    : row.orderQty.multiply(row.unitPrice).setScale(SCALE, RoundingMode.HALF_UP);
            amountByRow.put(row, amount);
            confirmTotal = confirmTotal.add(amount);
        }
        Long confirmerId = requester.getUserId();
        Map<String, Object> confirmHeader = tenantParams(tenantId);
        confirmHeader.put("confirmNo", generateNo(CONFIRM_NO_GENERATOR_KEY, "MC", tenantId, header.orderDt, "구매요청확정번호"));
        confirmHeader.put("confirmDt", header.orderDt);
        confirmHeader.put("confirmerId", confirmerId);
        confirmHeader.put("currencyCode", header.currencyCode);
        confirmHeader.put("totalAmt", confirmTotal);
        confirmHeader.put("remark", autoRemark);
        confirmHeader.put("createdBy", userId);
        Long purchaseConfirmId = confirmDAO.insertConfirmHeader(confirmHeader);
        if (purchaseConfirmId == null || purchaseConfirmId < 1L) {
            throw new IllegalStateException("구매요청확정 자동 생성에 실패했습니다.");
        }
        for (PreparedRow row : rows) {
            Map<String, Object> values = tenantParams(tenantId);
            values.put("purchaseRequestDetailId", row.purchaseRequestDetailId);
            values.put("purchaseConfirmId", purchaseConfirmId);
            values.put("confirmQty", row.orderQty);
            values.put("confirmDeliveryDt", row.deliveryDt);
            values.put("warehouseId", row.warehouseId);
            values.put("orderType", row.orderType);
            values.put("supplierId", header.supplierId);
            values.put("unitPrice", row.unitPrice);
            values.put("currencyCode", header.currencyCode);
            values.put("amount", amountByRow.get(row));
            values.put("confirmRemark", null);
            values.put("updatedBy", userId);
            if (confirmDAO.updateDetailConfirm(values) != 1) {
                throw itemsChanged();
            }
        }
        Map<String, Object> refresh = tenantParams(tenantId);
        refresh.put("purchaseRequestIds", Collections.singletonList(purchaseRequestId));
        refresh.put("updatedBy", userId);
        confirmDAO.refreshRequestStatuses(refresh);
    }

    /** 저장 후 확정수량을 넘겨 발주된 행 번호(1부터)를 돌려준다. 경고용이며 저장은 막지 않는다. */
    private List<Integer> findOverOrderedLines(Long tenantId, List<PreparedRow> rows) throws Exception {
        List<Long> ids = new ArrayList<Long>();
        for (PreparedRow row : rows) {
            ids.add(row.purchaseRequestDetailId);
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("detailIds", new ArrayList<Long>(new TreeSet<Long>(ids)));
        params.put("forUpdate", Boolean.FALSE);
        Map<Long, PurchaseOrderConfirmRowVO> byId = new HashMap<Long, PurchaseOrderConfirmRowVO>();
        for (PurchaseOrderConfirmRowVO row : orderDAO.selectConfirmRows(params)) {
            byId.put(row.getPurchaseRequestDetailId(), row);
        }
        List<Integer> over = new ArrayList<Integer>();
        for (int index = 0; index < rows.size(); index++) {
            PurchaseOrderConfirmRowVO confirmRow = byId.get(rows.get(index).purchaseRequestDetailId);
            if (confirmRow != null && confirmRow.getConfirmQty() != null && confirmRow.getOrderedQty() != null
                    && confirmRow.getOrderedQty().compareTo(confirmRow.getConfirmQty()) > 0) {
                over.add(index + 1);
            }
        }
        return over;
    }

    private PurchaseRequestRequesterVO findOrderer(Long tenantId, String userId) throws Exception {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("loginCode", userId);
        PurchaseRequestRequesterVO orderer = requestDAO.selectRequester(params);
        if (orderer == null || orderer.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "발주자 사용자 정보를 찾을 수 없습니다.");
        }
        return orderer;
    }

    private String generateNo(String key, String prefix, Long tenantId, LocalDate dt, String label) throws Exception {
        String dateKey = dt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(key, tenantId.toString(), dateKey);
        if (sequence == null || sequence < 1L) {
            throw new IllegalStateException(label + "를 생성할 수 없습니다.");
        }
        String no = String.format(Locale.ROOT, "%s-%s-%04d", prefix, dateKey, sequence);
        if (no.length() > NO_MAX_LENGTH) {
            throw new IllegalStateException(label + "를 생성할 수 없습니다.");
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
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "발주를 찾을 수 없습니다.");
    }

    private ResponseStatusException itemsChanged() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "발주할 확정 품목이 변경되었습니다. 화면을 다시 조회해 주세요.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static final class Header {
        private final String sourceType;
        private final LocalDate orderDt;
        private final Long supplierId;
        private String currencyCode;
        private final String taxType;
        private final boolean vatIncluded;
        private final String remark;
        private final String orderType;
        private final String useType;
        private final Long warehouseId;

        private Header(String sourceType, LocalDate orderDt, Long supplierId, String currencyCode, String taxType,
                boolean vatIncluded, String remark, String orderType, String useType, Long warehouseId) {
            this.sourceType = sourceType;
            this.orderDt = orderDt;
            this.supplierId = supplierId;
            this.currencyCode = currencyCode;
            this.taxType = taxType;
            this.vatIncluded = vatIncluded;
            this.remark = remark;
            this.orderType = orderType;
            this.useType = useType;
            this.warehouseId = warehouseId;
        }
    }

    private static final class PreparedRow {
        private Long purchaseRequestDetailId;
        private final Long materialId;
        private final BigDecimal orderQty;
        private final BigDecimal unitPrice;
        private final LocalDate deliveryDt;
        private final Long warehouseId;
        private final String orderType;
        private final String useType;
        private final String inspectAt;
        private final String remark;
        private final PurchaseOrderAmountCalculator.Amounts amounts;

        private PreparedRow(Long purchaseRequestDetailId, Long materialId, BigDecimal orderQty,
                BigDecimal unitPrice, LocalDate deliveryDt, Long warehouseId, String orderType, String useType,
                String inspectAt, String remark, PurchaseOrderAmountCalculator.Amounts amounts) {
            this.purchaseRequestDetailId = purchaseRequestDetailId;
            this.materialId = materialId;
            this.orderQty = orderQty;
            this.unitPrice = unitPrice;
            this.deliveryDt = deliveryDt;
            this.warehouseId = warehouseId;
            this.orderType = orderType;
            this.useType = useType;
            this.inspectAt = inspectAt;
            this.remark = remark;
            this.amounts = amounts;
        }
    }
}
