package egovframework.let.sales.shipment.delivery.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryDetailRequestVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryDetailVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryRequestVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliverySourceOrderSearchVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliverySourceOrderVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryStatusSearchVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryStatusVO;
import egovframework.let.sales.shipment.delivery.domain.model.SalesDeliveryVO;
import egovframework.let.sales.shipment.delivery.domain.repository.SalesDeliveryDAO;
import egovframework.let.sales.shipment.delivery.service.SalesDeliveryService;
import egovframework.let.sales.shipment.deliveryplan.service.SalesDeliveryPlanService;
import egovframework.let.sales.shipment.statement.service.impl.SalesStatementServiceImpl;
import egovframework.let.system.policies.service.SystemPolicyService;
import egovframework.let.sales.common.SalesDecimalPolicy;
import egovframework.com.cmm.DecimalColumnContract;

@Service("salesDeliveryService")
public class SalesDeliveryServiceImpl extends EgovAbstractServiceImpl implements SalesDeliveryService {
    private static final String DELIVERY_NO_GENERATOR_KEY = "SALES_DELIVERY_NO";
    private static final String DIRECT = "DIRECT";
    private static final String ORDER = "ORDER";
    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final SalesDeliveryDAO salesDeliveryDAO;
    private final IdSequenceService idSequenceService;
    private final SalesDeliveryPlanService planService;
    private final SystemPolicyService systemPolicyService;
    private final SalesStatementServiceImpl statementService;

    public SalesDeliveryServiceImpl(SalesDeliveryDAO salesDeliveryDAO, IdSequenceService idSequenceService,
            SalesDeliveryPlanService planService, SystemPolicyService systemPolicyService,
            SalesStatementServiceImpl statementService) {
        this.salesDeliveryDAO = salesDeliveryDAO;
        this.idSequenceService = idSequenceService;
        this.planService = planService;
        this.systemPolicyService = systemPolicyService;
        this.statementService = statementService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDeliveryVO createDelivery(Long tenantId, String userId, SalesDeliveryRequestVO payload)
            throws Exception {
        validatePrincipal(tenantId, userId);
        validatePayload(payload);
        validatePrimaryOrder(payload);
        Map<Long, SalesDeliverySourceOrderHeaderVO> sourceOrders =
                lockAndValidateOrders(tenantId, payload, Collections.<SalesDeliveryDetailVO>emptyList());
        validateCustomer(tenantId, payload.getCustomerId());
        SalesDecimalPolicy decimalPolicy = SalesDecimalPolicy.from(systemPolicyService.getGridDecimals(tenantId),
                DecimalColumnContract.forDocument("sales.delivery"));
        decimalPolicy.verifySnapshot(payload.getDecimalPolicy());
        decimalPolicy.verifyColumnContract(payload.getDecimalColumns());
        List<PreparedDetail> details = prepareDetails(tenantId, payload, sourceOrders, null, null, decimalPolicy);
        BigDecimal total = sumTotals(details, decimalPolicy);
        String deliveryNo = generateDeliveryNo(tenantId, payload.getDeliveryDt());

        Map<String, Object> header = new HashMap<String, Object>();
        header.put("tenantId", tenantId);
        header.put("deliveryNo", deliveryNo);
        header.put("deliveryDt", payload.getDeliveryDt());
        header.put("deliveryType", payload.getDeliveryType());
        header.put("customerId", payload.getCustomerId());
        header.put("salesOrderId", payload.getSalesOrderId());
        header.put("deliveryPlace", normalize(payload.getDeliveryPlace()));
        header.put("deliveryMethod", normalize(payload.getDeliveryMethod()));
        header.put("remark", normalize(payload.getRemark()));
        header.put("totalAmt", total);
        header.put("createdBy", userId);
        Long deliveryId = salesDeliveryDAO.insertDeliveryHeader(header);
        if (deliveryId == null || deliveryId.longValue() < 1L) {
            throw new IllegalStateException("출하 헤더 저장에 실패했습니다.");
        }

        persistDetails(deliveryId, tenantId, payload.getDeliveryType(), details);
        adjustDeliveryShippedQty(tenantId, userId, details, Collections.<SalesDeliveryDetailVO>emptyList());
        adjustPlanDeliveredQty(tenantId, userId, details, Collections.<SalesDeliveryDetailVO>emptyList());
        if ("AUTO".equals(systemPolicyService.getStatementIssueMode(tenantId))) {
            // 같은 트랜잭션에서 발행하므로 명세서 실패 시 출하 저장도 함께 롤백된다.
            statementService.create(tenantId, userId, deliveryId, payload.getDeliveryDt().toString(), "출하등록 자동 발행");
        }
        return getDelivery(tenantId, userId, deliveryId);
    }

    @Override
    public SalesDeliveryVO getDelivery(Long tenantId, String userId, Long salesDeliveryId) throws Exception {
        validatePrincipal(tenantId, userId);
        validateDeliveryId(salesDeliveryId);
        SalesDeliveryVO delivery = salesDeliveryDAO.selectDelivery(
                deliveryParams(tenantId, salesDeliveryId));
        if (delivery == null) {
            throw deliveryNotFound();
        }
        delivery.setDetails(salesDeliveryDAO.selectDeliveryDetails(
                deliveryParams(tenantId, salesDeliveryId)));
        delivery.setWriter(userId.equals(delivery.getCreatedBy()));
        return delivery;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDeliveryVO updateDelivery(Long tenantId, String userId, Long salesDeliveryId,
            SalesDeliveryRequestVO payload) throws Exception {
        validatePrincipal(tenantId, userId);
        validateDeliveryId(salesDeliveryId);
        validatePayload(payload);
        Map<String, Object> params = deliveryParams(tenantId, salesDeliveryId);
        SalesDeliveryVO observed = salesDeliveryDAO.selectDelivery(params);
        if (observed == null) {
            throw deliveryNotFound();
        }
        validateDeliveryLink(observed, payload);
        List<SalesDeliveryDetailVO> observedDetails = salesDeliveryDAO.selectDeliveryDetails(params);
        if (observedDetails == null) {
            observedDetails = new ArrayList<SalesDeliveryDetailVO>();
        }
        Map<Long, SalesDeliverySourceOrderHeaderVO> sourceOrders =
                lockAndValidateOrders(tenantId, payload, observedDetails);
        SalesDeliveryVO stored = salesDeliveryDAO.lockDeliveryHeader(params);
        if (stored == null) {
            throw deliveryNotFound();
        }
        validateDeliveryLink(stored, payload);
        validateCustomer(tenantId, payload.getCustomerId());
        List<SalesDeliveryDetailVO> oldDetails = salesDeliveryDAO.selectDeliveryDetails(params);
        if (oldDetails == null) {
            oldDetails = new ArrayList<SalesDeliveryDetailVO>();
        }
        SalesDecimalPolicy decimalPolicy = SalesDecimalPolicy.from(systemPolicyService.getGridDecimals(tenantId),
                DecimalColumnContract.forDocument("sales.delivery"));
        decimalPolicy.verifySnapshot(payload.getDecimalPolicy());
        decimalPolicy.verifyColumnContract(payload.getDecimalColumns());
        List<PreparedDetail> details = prepareDetails(
                tenantId, payload, sourceOrders, linkedPlanQuantities(oldDetails), linkedOrderQuantities(oldDetails), decimalPolicy);
        BigDecimal total = sumTotals(details, decimalPolicy);

        Map<String, Object> header = deliveryParams(tenantId, salesDeliveryId);
        header.put("deliveryDt", payload.getDeliveryDt());
        header.put("deliveryPlace", normalize(payload.getDeliveryPlace()));
        header.put("deliveryMethod", normalize(payload.getDeliveryMethod()));
        header.put("remark", normalize(payload.getRemark()));
        header.put("totalAmt", total);
        header.put("updatedBy", userId);
        if (salesDeliveryDAO.updateDeliveryHeader(header) != 1) {
            throw deliveryNotFound();
        }
        salesDeliveryDAO.deleteDeliveryDetails(params);
        persistDetails(salesDeliveryId, tenantId, payload.getDeliveryType(), details);
        adjustDeliveryShippedQty(tenantId, userId, details, oldDetails);
        adjustPlanDeliveredQty(tenantId, userId, details, oldDetails);
        return getDelivery(tenantId, userId, salesDeliveryId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDelivery(Long tenantId, String userId, Long salesDeliveryId) throws Exception {
        validatePrincipal(tenantId, userId);
        validateDeliveryId(salesDeliveryId);
        Map<String, Object> params = deliveryParams(tenantId, salesDeliveryId);
        SalesDeliveryVO observed = salesDeliveryDAO.selectDelivery(params);
        if (observed == null) {
            throw deliveryNotFound();
        }
        List<SalesDeliveryDetailVO> observedDetails = salesDeliveryDAO.selectDeliveryDetails(params);
        if (observedDetails == null) {
            observedDetails = new ArrayList<SalesDeliveryDetailVO>();
        }
        if (ORDER.equals(observed.getDeliveryType())) {
            lockExistingSourceOrders(tenantId, observed.getSalesOrderId(), observed.getCustomerId(), observedDetails);
        }
        SalesDeliveryVO stored = salesDeliveryDAO.lockDeliveryHeader(params);
        if (stored == null) {
            throw deliveryNotFound();
        }
        if (!same(observed.getDeliveryType(), stored.getDeliveryType())
                || !same(observed.getCustomerId(), stored.getCustomerId())
                || !same(observed.getSalesOrderId(), stored.getSalesOrderId())) {
            throw conflict("출하 연결이 조회 중 변경되었습니다. 다시 시도해 주세요.");
        }
        List<SalesDeliveryDetailVO> details = salesDeliveryDAO.selectDeliveryDetails(params);
        if (details != null && ORDER.equals(stored.getDeliveryType())) {
            adjustDeliveryShippedQty(tenantId, userId, Collections.<PreparedDetail>emptyList(), details);
            adjustPlanDeliveredQty(tenantId, userId, Collections.<PreparedDetail>emptyList(), details);
        }
        Map<String, Object> deleteParams = deliveryParams(tenantId, salesDeliveryId);
        deleteParams.put("updatedBy", userId);
        if (salesDeliveryDAO.softDeleteDeliveryHeader(deleteParams) != 1) {
            throw deliveryNotFound();
        }
    }

    @Override
    public List<SalesDeliverySourceOrderVO> listSourceOrders(Long tenantId,
            SalesDeliverySourceOrderSearchVO search) throws Exception {
        validateTenant(tenantId);
        if (search == null) {
            throw badRequest("수주일자 기준일을 입력해 주세요.");
        }
        LocalDate orderDtFrom = parseSourceSearchDate(search.getOrderDtFrom(), "수주일자", true);
        LocalDate orderDtTo = parseSourceSearchDate(search.getOrderDtTo(), "수주일자", true);
        if (orderDtFrom.isAfter(orderDtTo)) {
            throw badRequest("수주일자 시작일과 종료일을 확인해 주세요.");
        }
        LocalDate planDtFrom = parseSourceSearchDate(search.getPlanDtFrom(), "계획일자", false);
        LocalDate planDtTo = parseSourceSearchDate(search.getPlanDtTo(), "계획일자", false);
        if (planDtFrom != null && planDtTo != null && planDtFrom.isAfter(planDtTo)) {
            throw badRequest("계획일자 시작일과 종료일을 확인해 주세요.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("keyword", normalize(search.getKeyword()));
        params.put("orderDtFrom", orderDtFrom);
        params.put("orderDtTo", orderDtTo);
        params.put("orderNo", normalize(search.getOrderNo()));
        params.put("customerKeyword", normalize(search.getCustomerKeyword()));
        params.put("materialKeyword", normalize(search.getMaterialKeyword()));
        params.put("planNo", normalize(search.getPlanNo()));
        params.put("planDtFrom", planDtFrom);
        params.put("planDtTo", planDtTo);
        params.put("limit", 200);
        return salesDeliveryDAO.selectSourceOrders(params);
    }

    @Override
    public List<SalesDeliveryStatusVO> listStatus(Long tenantId, String userId,
            SalesDeliveryStatusSearchVO search)
            throws Exception {
        validatePrincipal(tenantId, userId);
        if (search == null) {
            throw badRequest("출하일자 기간을 입력해 주세요.");
        }
        LocalDate from = parseDate(search.getDeliveryDtFrom());
        LocalDate to = parseDate(search.getDeliveryDtTo());
        if (from == null || to == null || from.isAfter(to)) {
            throw badRequest("출하일 시작일과 종료일을 올바르게 입력해 주세요.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        params.put("deliveryDtFrom", from);
        params.put("deliveryDtTo", to);
        params.put("keyword", normalize(search.getKeyword()));
        params.put("deliveryType", normalize(search.getDeliveryType()));
        params.put("customerKeyword", normalize(search.getCustomerKeyword()));
        params.put("materialKeyword", normalize(search.getMaterialKeyword()));
        params.put("deliveryNo", normalize(search.getDeliveryNo()));
        return salesDeliveryDAO.selectDeliveryStatus(params);
    }

    private void validatePrimaryOrder(SalesDeliveryRequestVO payload) {
        if (ORDER.equals(payload.getDeliveryType())) {
            Long firstOrderId = sourceOrderId(payload.getDetails().get(0), payload);
            if (!same(firstOrderId, payload.getSalesOrderId())) {
                throw badRequest("대표 수주와 첫 상세의 수주가 일치하지 않습니다.");
            }
        }
    }

    private Map<Long, SalesDeliverySourceOrderHeaderVO> lockAndValidateOrders(
            Long tenantId, SalesDeliveryRequestVO payload, List<SalesDeliveryDetailVO> existingDetails)
            throws Exception {
        Map<Long, SalesDeliverySourceOrderHeaderVO> orders =
                new LinkedHashMap<Long, SalesDeliverySourceOrderHeaderVO>();
        if (DIRECT.equals(payload.getDeliveryType())) {
            return orders;
        }
        Set<Long> sourceIds = new HashSet<Long>();
        sourceIds.add(payload.getSalesOrderId());
        for (SalesDeliveryDetailRequestVO detail : payload.getDetails()) {
            sourceIds.add(sourceOrderId(detail, payload));
        }
        for (SalesDeliveryDetailVO detail : existingDetails) {
            if (detail.getSalesOrderId() != null) {
                sourceIds.add(detail.getSalesOrderId());
            }
        }
        List<Long> orderedIds = new ArrayList<Long>(sourceIds);
        Collections.sort(orderedIds);
        for (Long sourceId : orderedIds) {
            orders.put(sourceId, lockSourceOrderForReference(tenantId, sourceId, payload.getCustomerId()));
        }
        return orders;
    }

    private void lockExistingSourceOrders(Long tenantId, Long primaryOrderId, Long customerId,
            List<SalesDeliveryDetailVO> details) throws Exception {
        Set<Long> sourceIds = new HashSet<Long>();
        sourceIds.add(primaryOrderId);
        for (SalesDeliveryDetailVO detail : details) {
            if (detail.getSalesOrderId() != null) {
                sourceIds.add(detail.getSalesOrderId());
            }
        }
        List<Long> orderedIds = new ArrayList<Long>(sourceIds);
        Collections.sort(orderedIds);
        for (Long sourceId : orderedIds) {
            lockSourceOrderForReference(tenantId, sourceId, customerId);
        }
    }

    private void validateDeliveryLink(SalesDeliveryVO delivery, SalesDeliveryRequestVO payload) {
        if (!same(delivery.getDeliveryType(), payload.getDeliveryType())
                || !same(delivery.getCustomerId(), payload.getCustomerId())
                || !same(delivery.getSalesOrderId(), payload.getSalesOrderId())) {
            throw conflict("저장된 출하구분, 거래처 및 수주 연결은 변경할 수 없습니다.");
        }
    }

    private SalesDeliverySourceOrderHeaderVO lockSourceOrderForReference(
            Long tenantId, Long salesOrderId, Long customerId)
            throws Exception {
        if (salesOrderId == null || salesOrderId.longValue() < 1L) {
            throw badRequest("수주출하는 수주를 선택해야 합니다.");
        }
        SalesDeliverySourceOrderHeaderVO order = salesDeliveryDAO.lockSourceOrder(
                orderParams(tenantId, salesOrderId));
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수주를 찾을 수 없습니다.");
        }
        if (!same(order.getCustomerId(), customerId)) {
            throw conflict("수주 거래처와 출하 거래처가 일치하지 않습니다.");
        }
        if (isClosedOrder(order.getStatus())) {
            throw conflict("취소 또는 완료된 수주에는 출하할 수 없습니다.");
        }
        return order;
    }

    private List<PreparedDetail> prepareDetails(Long tenantId, SalesDeliveryRequestVO payload,
            Map<Long, SalesDeliverySourceOrderHeaderVO> sourceOrderHeaders, Map<Long, BigDecimal> oldPlanQuantities,
            Map<Long, BigDecimal> oldOrderQuantities, SalesDecimalPolicy decimalPolicy)
            throws Exception {
        List<PreparedDetail> prepared = new ArrayList<PreparedDetail>();
        Map<Long, SalesDeliverySourceOrderVO> sourcePlans = new LinkedHashMap<Long, SalesDeliverySourceOrderVO>();
        Map<Long, SalesDeliverySourceOrderVO> sourceOrderLines = new LinkedHashMap<Long, SalesDeliverySourceOrderVO>();
        Map<Long, BigDecimal> orderQuantities = new LinkedHashMap<Long, BigDecimal>();
        for (SalesDeliveryDetailRequestVO request : payload.getDetails()) {
            if (request == null || request.getMaterialId() == null || request.getMaterialId() < 1L) {
                throw badRequest("상세 품목을 선택해 주세요.");
            }
            if (!salesDeliveryDAO.existsActiveMaterial(referenceParams(tenantId, request.getMaterialId()))) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용 가능한 품목을 찾을 수 없습니다.");
            }
            PreparedDetail detail = prepareDetail(request, payload, decimalPolicy);
            if (ORDER.equals(payload.getDeliveryType())) {
                SalesDeliverySourceOrderVO sourceLine =
                        validateSourceDetail(tenantId, payload, sourceOrderHeaders, request);
                sourcePlans.put(detail.salesDeliveryPlanDetailId, sourceLine);
                sourceOrderLines.put(detail.salesOrderDetailId, sourceLine);
                addQuantity(orderQuantities, detail.salesOrderDetailId, detail.deliveryQty);
            }
            prepared.add(detail);
        }
        if (ORDER.equals(payload.getDeliveryType())) {
            String policy = planService.getOverDeliveryPolicy(tenantId);
            List<String> excesses = new ArrayList<String>();
            for (PreparedDetail detail : prepared) {
                SalesDeliverySourceOrderVO line = sourcePlans.get(detail.salesDeliveryPlanDetailId);
                BigDecimal after = valueOrZero(line.getDeliveredQty())
                        .subtract(previousQuantity(oldPlanQuantities, detail.salesDeliveryPlanDetailId))
                        .add(detail.deliveryQty);
                validateCumulativeQuantity(after, "계획 누적출하수량", decimalPolicy);
                addExcess(excesses, "계획 상세 " + detail.salesDeliveryPlanDetailId,
                        line.getPlannedQty(), after);
            }
            for (Map.Entry<Long, BigDecimal> entry : orderQuantities.entrySet()) {
                SalesDeliverySourceOrderVO line = sourceOrderLines.get(entry.getKey());
                BigDecimal after = valueOrZero(line.getShippedQty())
                        .subtract(previousQuantity(oldOrderQuantities, entry.getKey())).add(entry.getValue());
                validateCumulativeQuantity(after, "수주 누적출하수량", decimalPolicy);
                addExcess(excesses, "수주 상세 " + entry.getKey(), line.getOrderQty(), after);
            }
            if (!excesses.isEmpty()) {
                String message = String.join("; ", excesses);
                if (!"WARN".equals(policy)) {
                    throw conflict("초과출하 차단 정책입니다. " + message);
                }
                if (!payload.isOverDeliveryConfirmed()) {
                    throw conflict("[OVER_DELIVERY_CONFIRM_REQUIRED]초과출하를 저장하시겠습니까? " + message);
                }
            }
        }
        return prepared;
    }

    private BigDecimal previousQuantity(Map<Long, BigDecimal> quantities, Long detailId) {
        return quantities == null ? ZERO : valueOrZero(quantities.get(detailId));
    }

    private void validateCumulativeQuantity(BigDecimal quantity, String label, SalesDecimalPolicy decimalPolicy) {
        if (quantity.signum() < 0) {
            throw conflict(label + "이 유효하지 않습니다. 다시 조회해 주세요.");
        }
        decimalPolicy.storedQuantity(quantity, label);
    }

    private void addExcess(List<String> excesses, String label, BigDecimal baseline, BigDecimal after) {
        if (baseline == null || baseline.signum() < 0) {
            throw conflict(label + "의 기준수량이 유효하지 않습니다.");
        }
        if (after.compareTo(baseline) > 0) {
            excesses.add(label + ": 기준수량 " + baseline.stripTrailingZeros().toPlainString()
                    + ", 저장후누적 " + after.stripTrailingZeros().toPlainString()
                    + ", 초과수량 " + after.subtract(baseline).stripTrailingZeros().toPlainString());
        }
    }

    private SalesDeliverySourceOrderVO validateSourceDetail(Long tenantId, SalesDeliveryRequestVO payload,
            Map<Long, SalesDeliverySourceOrderHeaderVO> sourceOrders, SalesDeliveryDetailRequestVO request)
            throws Exception {
        Long salesOrderId = sourceOrderId(request, payload);
        Long detailId = request.getSalesOrderDetailId();
        Long planDetailId = request.getSalesDeliveryPlanDetailId();
        if (salesOrderId == null || detailId == null || detailId.longValue() < 1L
                || planDetailId == null || planDetailId.longValue() < 1L) {
            throw badRequest("수주출하 상세는 출하계획 상세를 선택해야 합니다.");
        }
        Map<String, Object> params = sourceDetailParams(tenantId, salesOrderId, detailId);
        params.put("salesDeliveryPlanDetailId", planDetailId);
        SalesDeliverySourceOrderVO line = salesDeliveryDAO.selectSourcePlanDetail(params);
        SalesDeliverySourceOrderHeaderVO order = sourceOrders.get(salesOrderId);
        if (line == null || !same(line.getSalesOrderId(), salesOrderId)
                || !same(line.getCustomerId(), payload.getCustomerId())
                || !same(line.getMaterialId(), request.getMaterialId())
                || !same(line.getSalesOrderDetailId(), detailId)
                || !same(line.getSalesDeliveryPlanDetailId(), planDetailId)
                || order == null || !same(order.getCustomerId(), payload.getCustomerId())) {
            throw conflict("출하계획 상세의 거래처, 품목 또는 수주 연결이 유효하지 않습니다.");
        }
        return line;
    }

    private PreparedDetail prepareDetail(SalesDeliveryDetailRequestVO request, SalesDeliveryRequestVO payload, SalesDecimalPolicy decimalPolicy) {
        if (request.getDeliveryQty() == null || request.getDeliveryQty().signum() <= 0) {
            throw badRequest("출하수량은 0보다 커야 합니다.");
        }
        if (request.getUnitPrice() == null || request.getUnitPrice().signum() < 0) {
            throw badRequest("단가는 0 이상이어야 합니다.");
        }
        if (request.getVatAmt() != null && request.getVatAmt().signum() < 0) {
            throw badRequest("부가세는 0 이상이어야 합니다.");
        }
        BigDecimal quantity = decimalPolicy.input("deliveryQty", request.getDeliveryQty(), "출하수량");
        BigDecimal unitPrice = decimalPolicy.input("unitPrice", request.getUnitPrice(), "단가");
        BigDecimal supplyAmt = decimalPolicy.amount("supplyAmt", quantity.multiply(unitPrice), "공급가액");
        BigDecimal vatAmt = request.getVatAmt() == null
                ? decimalPolicy.amount("vatAmt", supplyAmt.multiply(VAT_RATE), "부가세")
                : decimalPolicy.input("vatAmt", request.getVatAmt(), "부가세");
        BigDecimal totalAmt = decimalPolicy.amount("totalAmt", supplyAmt.add(vatAmt), "라인 합계");
        return new PreparedDetail(request.getMaterialId(), ORDER.equals(payload.getDeliveryType())
                ? sourceOrderId(request, payload) : null, request.getSalesOrderDetailId(),
                request.getSalesDeliveryPlanDetailId(), quantity, unitPrice, supplyAmt, vatAmt, totalAmt);
    }

    private void persistDetails(Long deliveryId, Long tenantId, String deliveryType,
            List<PreparedDetail> details) throws Exception {
        int lineNo = 1;
        for (PreparedDetail detail : details) {
            Map<String, Object> params = new HashMap<String, Object>();
            params.put("salesDeliveryId", deliveryId);
            params.put("tenantId", tenantId);
            params.put("deliveryType", deliveryType);
            params.put("lineNo", lineNo++);
            params.put("materialId", detail.materialId);
            params.put("salesOrderId", detail.salesOrderId);
            params.put("salesOrderDetailId", detail.salesOrderDetailId);
            params.put("salesDeliveryPlanDetailId", detail.salesDeliveryPlanDetailId);
            params.put("deliveryQty", detail.deliveryQty);
            params.put("unitPrice", detail.unitPrice);
            params.put("supplyAmt", detail.supplyAmt);
            params.put("vatAmt", detail.vatAmt);
            params.put("totalAmt", detail.totalAmt);
            Long savedId = salesDeliveryDAO.insertDeliveryDetail(params);
            if (savedId == null || savedId.longValue() < 1L) {
                throw new IllegalStateException("출하 상세 저장에 실패했습니다.");
            }
        }
    }

    private void adjustDeliveryShippedQty(Long tenantId, String userId, List<PreparedDetail> details,
            List<SalesDeliveryDetailVO> oldDetails) throws Exception {
        Map<Long, BigDecimal> newQuantities = new LinkedHashMap<Long, BigDecimal>();
        Map<Long, Long> newOrderIds = new HashMap<Long, Long>();
        for (PreparedDetail detail : details) {
            if (detail.salesOrderDetailId != null) {
                addQuantity(newQuantities, detail.salesOrderDetailId, detail.deliveryQty);
                newOrderIds.put(detail.salesOrderDetailId, detail.salesOrderId);
            }
        }
        Map<Long, BigDecimal> oldQuantities = linkedOrderQuantities(oldDetails);
        Map<Long, Long> oldOrderIds = new HashMap<Long, Long>();
        for (SalesDeliveryDetailVO detail : oldDetails) {
            if (detail.getSalesOrderDetailId() != null) {
                oldOrderIds.put(detail.getSalesOrderDetailId(), detail.getSalesOrderId());
            }
        }
        Set<Long> allDetailIds = new HashSet<Long>();
        allDetailIds.addAll(newQuantities.keySet());
        allDetailIds.addAll(oldQuantities.keySet());
        for (Long detailId : allDetailIds) {
            BigDecimal delta = valueOrZero(newQuantities.get(detailId))
                    .subtract(valueOrZero(oldQuantities.get(detailId)));
            Long salesOrderId = newOrderIds.containsKey(detailId)
                    ? newOrderIds.get(detailId) : oldOrderIds.get(detailId);
            if (delta.signum() != 0) {
                adjustShippedQty(tenantId, userId, salesOrderId, detailId, delta);
            }
        }
    }

    private void adjustShippedQty(Long tenantId, String userId, Long salesOrderId, Long salesOrderDetailId,
            BigDecimal delta) throws Exception {
        Map<String, Object> params = sourceDetailParams(tenantId, salesOrderId, salesOrderDetailId);
        params.put("deltaQty", delta);
        params.put("updatedBy", userId);
        if (salesDeliveryDAO.adjustShippedQty(params) != 1) {
            throw conflict("수주 잔량이 변경되었습니다. 다시 조회한 뒤 시도해 주세요.");
        }
    }

    private Map<Long, BigDecimal> linkedOrderQuantities(List<SalesDeliveryDetailVO> details) {
        Map<Long, BigDecimal> result = new LinkedHashMap<Long, BigDecimal>();
        for (SalesDeliveryDetailVO detail : details) {
            if (detail.getSalesOrderDetailId() != null) {
                addQuantity(result, detail.getSalesOrderDetailId(), detail.getDeliveryQty());
            }
        }
        return result;
    }

    private Map<Long, BigDecimal> linkedPlanQuantities(List<SalesDeliveryDetailVO> details) {
        Map<Long, BigDecimal> result = new LinkedHashMap<Long, BigDecimal>();
        for (SalesDeliveryDetailVO detail : details) {
            if (detail.getSalesDeliveryPlanDetailId() != null) {
                addQuantity(result, detail.getSalesDeliveryPlanDetailId(), detail.getDeliveryQty());
            }
        }
        return result;
    }

    private void adjustPlanDeliveredQty(Long tenantId, String userId, List<PreparedDetail> details,
            List<SalesDeliveryDetailVO> oldDetails) throws Exception {
        Map<Long, BigDecimal> newQuantities = new LinkedHashMap<Long, BigDecimal>();
        Map<Long, Long> sourceDetailIds = new HashMap<Long, Long>();
        Map<Long, Long> newOrderIds = new HashMap<Long, Long>();
        for (PreparedDetail detail : details) {
            if (detail.salesDeliveryPlanDetailId != null) {
                addQuantity(newQuantities, detail.salesDeliveryPlanDetailId, detail.deliveryQty);
                sourceDetailIds.put(detail.salesDeliveryPlanDetailId, detail.salesOrderDetailId);
                newOrderIds.put(detail.salesDeliveryPlanDetailId, detail.salesOrderId);
            }
        }
        Map<Long, BigDecimal> oldQuantities = linkedPlanQuantities(oldDetails);
        Map<Long, Long> oldDetailIds = new HashMap<Long, Long>();
        Map<Long, Long> oldOrderIds = new HashMap<Long, Long>();
        for (SalesDeliveryDetailVO detail : oldDetails) {
            if (detail.getSalesDeliveryPlanDetailId() != null) {
                oldDetailIds.put(detail.getSalesDeliveryPlanDetailId(), detail.getSalesOrderDetailId());
                oldOrderIds.put(detail.getSalesDeliveryPlanDetailId(), detail.getSalesOrderId());
            }
        }
        Set<Long> allPlanDetailIds = new HashSet<Long>();
        allPlanDetailIds.addAll(newQuantities.keySet());
        allPlanDetailIds.addAll(oldQuantities.keySet());
        for (Long planDetailId : allPlanDetailIds) {
            BigDecimal delta = valueOrZero(newQuantities.get(planDetailId))
                    .subtract(valueOrZero(oldQuantities.get(planDetailId)));
            Long salesOrderId = newOrderIds.containsKey(planDetailId)
                    ? newOrderIds.get(planDetailId) : oldOrderIds.get(planDetailId);
            Long salesOrderDetailId = sourceDetailIds.containsKey(planDetailId)
                    ? sourceDetailIds.get(planDetailId) : oldDetailIds.get(planDetailId);
            if (delta.signum() != 0) {
                adjustPlanDeliveredQty(tenantId, userId, salesOrderId, planDetailId, salesOrderDetailId, delta);
            }
        }
    }

    private void adjustPlanDeliveredQty(Long tenantId, String userId, Long salesOrderId,
            Long planDetailId, Long salesOrderDetailId, BigDecimal delta) throws Exception {
        Map<String, Object> params = orderParams(tenantId, salesOrderId);
        params.put("salesDeliveryPlanDetailId", planDetailId);
        params.put("salesOrderDetailId", salesOrderDetailId);
        params.put("deltaQty", delta);
        params.put("updatedBy", userId);
        if (salesDeliveryDAO.adjustPlanDeliveredQty(params) != 1) {
            throw conflict("출하계획 잔량이 변경되었습니다. 다시 조회한 뒤 시도해 주세요.");
        }
    }

    private void addQuantity(Map<Long, BigDecimal> quantities, Long key, BigDecimal value) {
        quantities.put(key, valueOrZero(quantities.get(key)).add(valueOrZero(value)));
    }

    private BigDecimal sumTotals(List<PreparedDetail> details, SalesDecimalPolicy decimalPolicy) {
        BigDecimal total = ZERO;
        for (PreparedDetail detail : details) {
            total = total.add(detail.totalAmt);
        }
        return decimalPolicy.amount("deliveryTotal", total, "출하 총액");
    }

    private void validatePayload(SalesDeliveryRequestVO payload) {
        if (payload == null || payload.getDeliveryDt() == null
                || payload.getCustomerId() == null || payload.getCustomerId() < 1L
                || payload.getDetails() == null || payload.getDetails().isEmpty()) {
            throw badRequest("출하일자, 거래처 및 상세 품목을 입력해 주세요.");
        }
        if (!DIRECT.equals(payload.getDeliveryType()) && !ORDER.equals(payload.getDeliveryType())) {
            throw badRequest("출하구분은 DIRECT 또는 ORDER여야 합니다.");
        }
        if (DIRECT.equals(payload.getDeliveryType())) {
            if (payload.getSalesOrderId() != null) {
                throw badRequest("직출하에는 수주를 연결할 수 없습니다.");
            }
            for (SalesDeliveryDetailRequestVO detail : payload.getDetails()) {
                if (detail == null) {
                    throw badRequest("상세 품목을 입력해 주세요.");
                }
                if (detail.getSalesOrderId() != null || detail.getSalesOrderDetailId() != null
                        || detail.getSalesDeliveryPlanDetailId() != null) {
                    throw badRequest("직출하에는 수주 또는 출하계획 상세를 연결할 수 없습니다.");
                }
            }
        } else if (payload.getSalesOrderId() == null || payload.getSalesOrderId() < 1L) {
            throw badRequest("수주출하는 수주를 선택해야 합니다.");
        }
        Set<Long> planDetailIds = new HashSet<Long>();
        for (SalesDeliveryDetailRequestVO detail : payload.getDetails()) {
            if (detail == null) {
                throw badRequest("상세 품목을 입력해 주세요.");
            }
            if (detail.getSalesOrderId() != null && detail.getSalesOrderId() < 1L) {
                throw badRequest("상세행 수주 ID는 1 이상의 값이어야 합니다.");
            }
            if (ORDER.equals(payload.getDeliveryType())
                    && detail.getSalesDeliveryPlanDetailId() == null) {
                throw badRequest("수주출하는 출하계획 상세를 선택해야 합니다.");
            }
            if (detail.getSalesDeliveryPlanDetailId() != null
                    && !planDetailIds.add(detail.getSalesDeliveryPlanDetailId())) {
                throw badRequest("같은 출하계획 상세를 중복 등록할 수 없습니다.");
            }
        }
        validateText(payload.getDeliveryPlace(), 200, "출하장소");
        validateText(payload.getDeliveryMethod(), 50, "배송방법");
        validateText(payload.getRemark(), 500, "비고");
    }

    private void validateCustomer(Long tenantId, Long customerId) throws Exception {
        if (!salesDeliveryDAO.existsActiveCustomer(referenceParams(tenantId, customerId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용 가능한 거래처를 찾을 수 없습니다.");
        }
    }

    private String generateDeliveryNo(Long tenantId, LocalDate deliveryDt) throws Exception {
        String dateKey = deliveryDt.toString().replace("-", "");
        Long sequence = idSequenceService.nextValue(
                DELIVERY_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence.longValue() < 1L) {
            throw new IllegalStateException("출하번호를 생성할 수 없습니다.");
        }
        String number = String.format(Locale.ROOT, "SD-%s-%04d", dateKey, sequence);
        if (number.length() > 30) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "출하번호를 생성할 수 없습니다.");
        }
        return number;
    }

    private void validatePrincipal(Long tenantId, String userId) {
        validateTenant(tenantId);
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateDeliveryId(Long salesDeliveryId) {
        if (salesDeliveryId == null || salesDeliveryId.longValue() < 1L) {
            throw badRequest("출하 ID는 1 이상의 값이어야 합니다.");
        }
    }

    private void validateTenant(Long tenantId) {
        if (tenantId == null || tenantId.longValue() < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateText(String value, int maxLength, String label) {
        if (value != null && value.trim().length() > maxLength) {
            throw badRequest(label + "은 " + maxLength + "자 이내로 입력해 주세요.");
        }
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw badRequest("출하일자를 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }

    private LocalDate parseSourceSearchDate(String value, String label, boolean required) {
        String normalized = normalize(value);
        if (normalized == null) {
            if (required) {
                throw badRequest(label + " 기준일의 시작일과 종료일을 입력해 주세요.");
            }
            return null;
        }
        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException exception) {
            throw badRequest(label + "을 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }

    private boolean isClosedOrder(String status) {
        return status == null || status.contains("취소")
                || "출하완료".equals(status) || "완료".equals(status);
    }

    private boolean same(Object left, Object right) {
        return left == null ? right == null : left.equals(right);
    }

    private Map<String, Object> deliveryParams(Long tenantId, Long salesDeliveryId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("salesDeliveryId", salesDeliveryId);
        return params;
    }

    private Map<String, Object> orderParams(Long tenantId, Long salesOrderId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("salesOrderId", salesOrderId);
        return params;
    }

    private Map<String, Object> referenceParams(Long tenantId, Long id) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("id", id);
        return params;
    }

    private Map<String, Object> sourceDetailParams(Long tenantId, Long salesOrderId,
            Long salesOrderDetailId) {
        Map<String, Object> params = orderParams(tenantId, salesOrderId);
        params.put("salesOrderDetailId", salesOrderDetailId);
        return params;
    }

    private Long sourceOrderId(SalesDeliveryDetailRequestVO detail, SalesDeliveryRequestVO payload) {
        return detail.getSalesOrderId() == null ? payload.getSalesOrderId() : detail.getSalesOrderId();
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException deliveryNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "출하 정보를 찾을 수 없습니다.");
    }

    private static final class PreparedDetail {
        private final Long materialId;
        private final Long salesOrderId;
        private final Long salesOrderDetailId;
        private final Long salesDeliveryPlanDetailId;
        private final BigDecimal deliveryQty;
        private final BigDecimal unitPrice;
        private final BigDecimal supplyAmt;
        private final BigDecimal vatAmt;
        private final BigDecimal totalAmt;

        private PreparedDetail(Long materialId, Long salesOrderId, Long salesOrderDetailId,
                Long salesDeliveryPlanDetailId, BigDecimal deliveryQty,
                BigDecimal unitPrice, BigDecimal supplyAmt, BigDecimal vatAmt, BigDecimal totalAmt) {
            this.materialId = materialId;
            this.salesOrderId = salesOrderId;
            this.salesOrderDetailId = salesOrderDetailId;
            this.salesDeliveryPlanDetailId = salesDeliveryPlanDetailId;
            this.deliveryQty = deliveryQty;
            this.unitPrice = unitPrice;
            this.supplyAmt = supplyAmt;
            this.vatAmt = vatAmt;
            this.totalAmt = totalAmt;
        }
    }
}
