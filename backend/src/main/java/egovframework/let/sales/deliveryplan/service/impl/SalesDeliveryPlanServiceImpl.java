package egovframework.let.sales.deliveryplan.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.delivery.domain.model.SalesDeliverySourceOrderHeaderVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanDetailRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanDetailVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanRequestVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanSourceVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanStatusSearchVO;
import egovframework.let.sales.deliveryplan.domain.model.SalesDeliveryPlanVO;
import egovframework.let.sales.deliveryplan.domain.repository.SalesDeliveryPlanDAO;
import egovframework.let.sales.deliveryplan.service.SalesDeliveryPlanService;

@Service("salesDeliveryPlanService")
public class SalesDeliveryPlanServiceImpl extends EgovAbstractServiceImpl implements SalesDeliveryPlanService {
    private static final String MODE_AUTO = "AUTO";
    private static final String MODE_MANUAL = "MANUAL";
    private static final String PLAN_NO_GENERATOR_KEY = "SALES_DELIVERY_PLAN_NO";
    private static final String EDITABLE_ORDER_STATUS = "수주등록";
    private static final int PLAN_NO_MAX_LENGTH = 30;
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int QTY_SCALE = 2;
    private static final int MAX_NUMERIC_PRECISION = 15;

    private final SalesDeliveryPlanDAO dao;
    private final IdSequenceService sequenceService;

    public SalesDeliveryPlanServiceImpl(SalesDeliveryPlanDAO dao, IdSequenceService sequenceService) {
        this.dao = dao;
        this.sequenceService = sequenceService;
    }

    @Override
    public String getMode(Long tenantId) throws Exception {
        validateTenant(tenantId);
        return normalizeMode(dao.selectTenantMode(tenantId));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY, rollbackFor = Exception.class)
    public String lockModeForPlanCreation(Long tenantId) throws Exception {
        validateTenant(tenantId);
        return normalizeMode(dao.lockTenantModeForPlanCreation(tenantId));
    }

    private String normalizeMode(String mode) {
        if (!StringUtils.hasText(mode)) {
            return MODE_AUTO;
        }
        mode = mode.trim().toUpperCase();
        if (!MODE_AUTO.equals(mode) && !MODE_MANUAL.equals(mode)) {
            throw new IllegalStateException("테넌트 출하계획 운영 설정이 올바르지 않습니다.");
        }
        return mode;
    }

    @Override
    public String getOverDeliveryPolicy(Long tenantId) throws Exception {
        validateTenant(tenantId);
        String policy = dao.selectTenantOverDeliveryPolicy(tenantId);
        if (policy == null) {
            return "BLOCK";
        }
        if (!"BLOCK".equals(policy) && !"WARN".equals(policy)) {
            throw new IllegalStateException("테넌트 초과출하 정책이 올바르지 않습니다.");
        }
        return policy;
    }

    @Override
    public List<SalesDeliveryPlanSourceVO> listSourceOrders(Long tenantId, String keyword) throws Exception {
        validateTenant(tenantId);
        Map<String, Object> params = tenantParams(tenantId);
        params.put("deliveryPlanMode", getMode(tenantId));
        params.put("keyword", normalize(keyword));
        params.put("limit", 200);
        return dao.selectPlanSourceOrders(params);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDeliveryPlanVO create(Long tenantId, String userId, SalesDeliveryPlanRequestVO request)
            throws Exception {
        validatePrincipal(tenantId, userId);
        if (!MODE_MANUAL.equals(lockModeForPlanCreation(tenantId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AUTO 테넌트에서는 출하계획을 직접 등록할 수 없습니다.");
        }
        return createPlan(tenantId, userId, request);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createAutomaticPlan(Long tenantId, String userId, SalesDeliveryPlanRequestVO request)
            throws Exception {
        validatePrincipal(tenantId, userId);
        if (!MODE_AUTO.equals(lockModeForPlanCreation(tenantId))) {
            throw conflict("MANUAL 테넌트의 출하계획은 사용자가 직접 등록해야 합니다.");
        }
        validateRequest(request, false);
        if (requestOrderIds(request.getDetails()).size() != 1) {
            throw badRequest("자동 출하계획은 한 수주의 상세만 포함할 수 있습니다.");
        }
        persistPlan(tenantId, userId, request);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void synchronizeAutomaticPlan(Long tenantId, String userId, Long salesOrderId,
            List<Long> retainedOrderDetailIds) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(salesOrderId);
        if (!MODE_AUTO.equals(getMode(tenantId))) {
            throw conflict("MANUAL 테넌트의 출하계획은 자동 수정할 수 없습니다.");
        }

        Map<String, Object> orderParams = orderParams(tenantId, salesOrderId);
        if (dao.lockSourceOrder(orderParams) == null) {
            throw notFound("수주를 찾을 수 없습니다.");
        }
        boolean allowExcess = "WARN".equals(getOverDeliveryPolicy(tenantId));
        SalesDeliveryPlanVO plan = dao.selectPlanByOrder(orderParams);
        if (plan == null) {
            throw conflict("수주에 연결된 자동 출하계획을 찾을 수 없습니다.");
        }
        Map<String, Object> planParams = planParams(tenantId, plan.getSalesDeliveryPlanId());
        if (dao.lockPlanHeader(planParams) == null) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }

        if (retainedOrderDetailIds == null) {
            throw badRequest("수주 상세 항목을 확인할 수 없습니다.");
        }
        Set<Long> retained = new HashSet<Long>(retainedOrderDetailIds);
        List<SalesDeliveryPlanDetailVO> orderLines = dao.selectOrderLines(orderParams);
        Map<Long, SalesDeliveryPlanDetailVO> currentByOrderDetail =
                new HashMap<Long, SalesDeliveryPlanDetailVO>();
        for (SalesDeliveryPlanDetailVO detail : dao.selectPlanDetails(planParams)) {
            if (!same(detail.getSalesOrderId(), salesOrderId)) {
                throw conflict("자동 출하계획의 모든 상세는 해당 수주에 속해야 합니다.");
            }
            if (currentByOrderDetail.put(detail.getSalesOrderDetailId(), detail) != null) {
                throw conflict("자동 출하계획에서 수주 상세가 중복 참조됩니다.");
            }
        }
        Set<Long> synchronizedIds = new HashSet<Long>();
        for (SalesDeliveryPlanDetailVO line : orderLines) {
            Long orderDetailId = line.getSalesOrderDetailId();
            if (!retained.contains(orderDetailId)) {
                continue;
            }
            SalesDeliveryPlanDetailVO existing = currentByOrderDetail.remove(orderDetailId);
            SalesDeliveryPlanDetailRequestVO detail = new SalesDeliveryPlanDetailRequestVO();
            detail.setSalesOrderId(salesOrderId);
            detail.setSalesOrderDetailId(orderDetailId);
            detail.setPlanDt(line.getPlanDt());
            detail.setPlannedQty(line.getOrderQty());
            if (existing == null) {
                Map<String, Object> params = detailParams(tenantId, salesOrderId,
                        plan.getSalesDeliveryPlanId(), line, detail, line.getLineNo(), userId);
                Long insertedId = dao.insertPlanDetail(params);
                if (insertedId == null || insertedId.longValue() < 1L) {
                    throw new IllegalStateException("자동 출하계획 상세 저장에 실패했습니다.");
                }
                synchronizedIds.add(orderDetailId);
                continue;
            }
            if (!allowExcess && detail.getPlannedQty().compareTo(zeroIfNull(existing.getDeliveredQty())) < 0) {
                throw conflict("수주수량은 이미 출하된 수량보다 적을 수 없습니다.");
            }
            synchronizedIds.add(orderDetailId);
        }

        for (SalesDeliveryPlanDetailVO orphan : currentByOrderDetail.values()) {
            Map<String, Object> params = detailParamsForExisting(tenantId,
                    plan.getSalesDeliveryPlanId(), orphan.getSalesDeliveryPlanDetailId());
            if (dao.countDeliveryReferences(params) > 0 || isPositive(orphan.getDeliveredQty())) {
                throw conflict("출하에 사용된 자동 출하계획 상세는 삭제할 수 없습니다.");
            }
            if (dao.deletePlanDetail(params) != 1) {
                throw conflict("자동 출하계획 상세가 동시에 변경되었습니다.");
            }
        }
        if (!synchronizedIds.equals(retained)) {
            throw conflict("자동 출하계획과 수주 상세가 일치하지 않습니다.");
        }
    }

    private SalesDeliveryPlanVO createPlan(Long tenantId, String userId, SalesDeliveryPlanRequestVO request)
            throws Exception {
        Long planId = persistPlan(tenantId, userId, request);
        Map<String, Object> planParams = planParams(tenantId, planId);
        SalesDeliveryPlanVO result = dao.selectPlanHeader(planParams);
        if (result == null) {
            throw new IllegalStateException("저장한 출하계획을 다시 조회할 수 없습니다.");
        }
        result.setDetails(dao.selectPlanDetails(planParams));
        return result;
    }

    private Long persistPlan(Long tenantId, String userId, SalesDeliveryPlanRequestVO request) throws Exception {
        validateRequest(request, false);

        Map<Long, SalesDeliverySourceOrderHeaderVO> ordersById =
                lockSourceOrders(tenantId, requestOrderIds(request.getDetails()));
        Map<SourceKey, SalesDeliveryPlanDetailVO> linesBySource =
                loadSourceLines(tenantId, ordersById.keySet());
        Map<SourceKey, BigDecimal> quantities = validateAndSumDetails(request, linesBySource, null);
        for (SourceKey key : quantities.keySet()) {
            SalesDeliveryPlanDetailVO line = linesBySource.get(key);
            if (isPositive(line.getShippedQty())) {
                throw conflict("출하 이력이 있는 수주에는 새 출하계획을 등록할 수 없습니다.");
            }
        }
        validateTotals(tenantId, quantities, linesBySource, null, null, false);

        String planNo = generatePlanNo(tenantId);
        Map<String, Object> header = tenantParams(tenantId);
        header.put("planNo", planNo);
        header.put("createdBy", userId);
        Long planId = dao.insertPlanHeader(header);
        if (planId == null || planId.longValue() < 1L) {
            throw new IllegalStateException("출하계획 헤더 저장에 실패했습니다.");
        }

        int lineNo = 1;
        for (SalesDeliveryPlanDetailRequestVO detail : request.getDetails()) {
            SalesDeliveryPlanDetailVO orderLine = linesBySource.get(
                    new SourceKey(detail.getSalesOrderId(), detail.getSalesOrderDetailId()));
            Map<String, Object> params = detailParams(tenantId, detail.getSalesOrderId(), planId,
                    orderLine, detail, lineNo++, userId);
            Long detailId = dao.insertPlanDetail(params);
            if (detailId == null || detailId.longValue() < 1L) {
                throw new IllegalStateException("출하계획 상세 저장에 실패했습니다.");
            }
        }

        return planId;
    }

    @Override
    public SalesDeliveryPlanVO get(Long tenantId, String userId, Long planId) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(planId);
        SalesDeliveryPlanVO plan = dao.selectPlanHeader(planParams(tenantId, planId));
        if (plan == null) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }
        plan.setDetails(dao.selectPlanDetails(planParams(tenantId, planId)));
        return plan;
    }

    @Override
    public SalesDeliveryPlanVO getByOrder(Long tenantId, String userId, Long salesOrderId) throws Exception {
        validatePrincipal(tenantId, userId);
        if (!MODE_AUTO.equals(getMode(tenantId))) {
            throw conflict("수주 기준 출하계획 조회는 AUTO 테넌트에서만 지원합니다.");
        }
        if (salesOrderId == null || salesOrderId.longValue() < 1L) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }
        Map<String, Object> params = orderParams(tenantId, salesOrderId);
        SalesDeliveryPlanVO plan = dao.selectPlanByOrder(params);
        if (plan == null) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }
        plan.setDetails(dao.selectPlanDetails(planParams(tenantId, plan.getSalesDeliveryPlanId())));
        return plan;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SalesDeliveryPlanVO update(Long tenantId, String userId, Long planId,
            SalesDeliveryPlanRequestVO request) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(planId);
        validateRequest(request, true);

        Map<String, Object> planParams = planParams(tenantId, planId);
        SalesDeliveryPlanVO plan = dao.selectPlanHeader(planParams);
        if (plan == null) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }
        List<SalesDeliveryPlanDetailVO> beforeLock = dao.selectPlanDetails(planParams);
        Set<Long> sourceOrderIds = requestOrderIds(request.getDetails());
        for (SalesDeliveryPlanDetailVO detail : beforeLock) {
            sourceOrderIds.add(detail.getSalesOrderId());
        }
        Map<Long, SalesDeliverySourceOrderHeaderVO> ordersById = lockSourceOrders(tenantId, sourceOrderIds);
        boolean allowExcess = "WARN".equals(getOverDeliveryPolicy(tenantId));
        SalesDeliveryPlanVO lockedPlan = dao.lockPlanHeader(planParams);
        if (lockedPlan == null) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }

        List<SalesDeliveryPlanDetailVO> current = dao.selectPlanDetails(planParams);
        Map<Long, SalesDeliveryPlanDetailVO> currentById = indexPlanDetails(current);
        for (SalesDeliveryPlanDetailVO detail : current) {
            if (!sourceOrderIds.contains(detail.getSalesOrderId())) {
                throw conflict("출하계획 원본 수주가 동시에 변경되었습니다.");
            }
        }
        Map<SourceKey, SalesDeliveryPlanDetailVO> linesBySource =
                loadSourceLines(tenantId, ordersById.keySet());
        Map<SourceKey, BigDecimal> quantities = validateAndSumDetails(request, linesBySource, currentById);
        validateTotals(tenantId, quantities, linesBySource, currentById, planId, allowExcess);
        for (SalesDeliveryPlanDetailRequestVO detail : request.getDetails()) {
            if (detail.getSalesDeliveryPlanDetailId() != null) {
                SalesDeliveryPlanDetailVO stored = currentById.get(detail.getSalesDeliveryPlanDetailId());
                if (!allowExcess && detail.getPlannedQty().compareTo(zeroIfNull(stored.getDeliveredQty())) < 0) {
                    throw conflict("계획 상세 수량은 해당 상세에 이미 출하된 수량보다 적을 수 없습니다.");
                }
            }
        }
        persistChanges(tenantId, userId, planId, request, linesBySource, currentById);
        return get(tenantId, userId, planId);
    }

    @Override
    public List<SalesDeliveryPlanVO> listStatus(Long tenantId, String userId,
            SalesDeliveryPlanStatusSearchVO search) throws Exception {
        validatePrincipal(tenantId, userId);
        if (search == null) {
            throw badRequest("검색 조건을 입력해 주세요.");
        }
        LocalDate from = parseDate(search.getPlanDtFrom());
        LocalDate to = parseDate(search.getPlanDtTo());
        if (from == null || to == null || from.isAfter(to)) {
            throw badRequest("계획일 기간을 올바르게 입력해 주세요.");
        }
        Map<String, Object> params = tenantParams(tenantId);
        params.put("planDtFrom", from);
        params.put("planDtTo", to);
        params.put("keyword", normalize(search.getKeyword()));
        return dao.selectPlanStatus(params);
    }

    private void persistChanges(Long tenantId, String userId, Long planId, SalesDeliveryPlanRequestVO request,
            Map<SourceKey, SalesDeliveryPlanDetailVO> linesBySource,
            Map<Long, SalesDeliveryPlanDetailVO> currentById) throws Exception {
        Set<Long> retainedIds = new HashSet<Long>();
        int nextLineNo = 1;
        for (SalesDeliveryPlanDetailVO current : currentById.values()) {
            if (current.getLineNo() != null && current.getLineNo() >= nextLineNo) {
                nextLineNo = current.getLineNo() + 1;
            }
        }
        for (SalesDeliveryPlanDetailRequestVO detail : request.getDetails()) {
            SalesDeliveryPlanDetailVO source = linesBySource.get(
                    new SourceKey(detail.getSalesOrderId(), detail.getSalesOrderDetailId()));
            Long detailId = detail.getSalesDeliveryPlanDetailId();
            if (detailId == null) {
                Map<String, Object> params = detailParams(tenantId, detail.getSalesOrderId(), planId, source,
                        detail, nextLineNo, userId);
                nextLineNo++;
                Long insertedId = dao.insertPlanDetail(params);
                if (insertedId == null || insertedId.longValue() < 1L) {
                    throw new IllegalStateException("출하계획 상세 저장에 실패했습니다.");
                }
                continue;
            }
            SalesDeliveryPlanDetailVO stored = currentById.get(detailId);
            if (stored == null || !same(stored.getSalesOrderId(), detail.getSalesOrderId())
                    || !same(stored.getSalesOrderDetailId(), detail.getSalesOrderDetailId())) {
                throw badRequest("출하계획 상세 항목이 올바르지 않습니다.");
            }
            retainedIds.add(detailId);
            Map<String, Object> params = detailParams(tenantId, detail.getSalesOrderId(), planId, source,
                    detail, stored.getLineNo(), userId);
            boolean changed = !same(stored.getPlanDt(), detail.getPlanDt())
                    || !sameDecimal(stored.getPlannedQty(), detail.getPlannedQty());
            int references = dao.countDeliveryReferences(detailParamsForExisting(tenantId, planId, detailId));
            if (references > 0 && changed) {
                throw conflict("출하에 사용된 출하계획 상세는 수정할 수 없습니다.");
            }
            if (changed) {
                params.put("salesDeliveryPlanDetailId", detailId);
                params.put("deliveredQty", stored.getDeliveredQty());
                if (dao.updatePlanDetail(params) != 1) {
                    throw notFound("출하계획 상세를 찾을 수 없습니다.");
                }
            }
        }
        for (SalesDeliveryPlanDetailVO stored : currentById.values()) {
            if (retainedIds.contains(stored.getSalesDeliveryPlanDetailId())) {
                continue;
            }
            Map<String, Object> params = detailParamsForExisting(
                    tenantId, planId, stored.getSalesDeliveryPlanDetailId());
            if (dao.countDeliveryReferences(params) > 0 || isPositive(stored.getDeliveredQty())) {
                throw conflict("출하에 사용된 출하계획 상세는 삭제할 수 없습니다.");
            }
            if (dao.deletePlanDetail(params) != 1) {
                throw notFound("출하계획 상세를 찾을 수 없습니다.");
            }
        }
    }

    private Map<SourceKey, BigDecimal> validateAndSumDetails(SalesDeliveryPlanRequestVO request,
            Map<SourceKey, SalesDeliveryPlanDetailVO> linesBySource,
            Map<Long, SalesDeliveryPlanDetailVO> currentById) {
        Map<SourceKey, BigDecimal> totals = new LinkedHashMap<SourceKey, BigDecimal>();
        Set<Long> detailIds = new HashSet<Long>();
        for (SalesDeliveryPlanDetailRequestVO detail : request.getDetails()) {
            if (detail == null || detail.getSalesOrderId() == null || detail.getSalesOrderId().longValue() < 1L
                    || detail.getSalesOrderDetailId() == null
                    || detail.getSalesOrderDetailId().longValue() < 1L) {
                throw badRequest("수주 상세를 선택해 주세요.");
            }
            SourceKey key = new SourceKey(detail.getSalesOrderId(), detail.getSalesOrderDetailId());
            if (!linesBySource.containsKey(key)) {
                throw badRequest("수주에 포함되지 않은 상세 항목입니다.");
            }
            validateQuantity(detail.getPlannedQty());
            if (detail.getSalesDeliveryPlanDetailId() != null) {
                if (currentById == null || !detailIds.add(detail.getSalesDeliveryPlanDetailId())) {
                    throw badRequest("출하계획 상세 항목이 중복되었거나 올바르지 않습니다.");
                }
                SalesDeliveryPlanDetailVO stored = currentById.get(detail.getSalesDeliveryPlanDetailId());
                if (stored == null || !same(stored.getSalesOrderId(), detail.getSalesOrderId())
                        || !same(stored.getSalesOrderDetailId(), detail.getSalesOrderDetailId())) {
                    throw badRequest("출하계획 상세 항목이 올바르지 않습니다.");
                }
            }
            BigDecimal previous = totals.get(key);
            totals.put(key,
                    (previous == null ? ZERO : previous).add(detail.getPlannedQty()));
        }
        return totals;
    }

    private void validateTotals(Long tenantId, Map<SourceKey, BigDecimal> totals,
            Map<SourceKey, SalesDeliveryPlanDetailVO> linesBySource,
            Map<Long, SalesDeliveryPlanDetailVO> currentById, Long currentPlanId,
            boolean allowExcess) throws Exception {
        for (Map.Entry<SourceKey, BigDecimal> entry : totals.entrySet()) {
            SalesDeliveryPlanDetailVO orderLine = linesBySource.get(entry.getKey());
            BigDecimal ceiling = orderLine.getOrderQty();
            if (currentById != null && !allowExcess) {
                BigDecimal delivered = ZERO;
                for (SalesDeliveryPlanDetailVO current : currentById.values()) {
                    if (same(current.getSalesOrderId(), entry.getKey().salesOrderId)
                            && same(current.getSalesOrderDetailId(), entry.getKey().salesOrderDetailId)) {
                        delivered = delivered.add(zeroIfNull(current.getDeliveredQty()));
                    }
                }
                if (entry.getValue().compareTo(delivered) < 0) {
                    throw conflict("계획수량은 이미 출하된 수량보다 적을 수 없습니다.");
                }
            }
            Map<String, Object> params = orderParams(tenantId, entry.getKey().salesOrderId);
            params.put("salesOrderDetailId", entry.getKey().salesOrderDetailId);
            params.put("currentPlanId", currentPlanId);
            BigDecimal otherPlanned = zeroIfNull(dao.sumOtherPlannedQty(params));
            if (ceiling == null || otherPlanned.add(entry.getValue()).compareTo(ceiling) > 0) {
                throw conflict("수주 상세의 계획수량 합계가 수주수량을 초과합니다.");
            }
        }
    }

    private Map<SourceKey, SalesDeliveryPlanDetailVO> loadSourceLines(Long tenantId, Iterable<Long> orderIds)
            throws Exception {
        Map<SourceKey, SalesDeliveryPlanDetailVO> result =
                new LinkedHashMap<SourceKey, SalesDeliveryPlanDetailVO>();
        for (Long orderId : orderIds) {
            List<SalesDeliveryPlanDetailVO> rows = dao.selectOrderLines(orderParams(tenantId, orderId));
            if (rows != null) {
                for (SalesDeliveryPlanDetailVO row : rows) {
                    if (same(orderId, row.getSalesOrderId()) && row.getSalesOrderDetailId() != null) {
                        result.put(new SourceKey(orderId, row.getSalesOrderDetailId()), row);
                    }
                }
            }
        }
        return result;
    }

    private Map<Long, SalesDeliverySourceOrderHeaderVO> lockSourceOrders(Long tenantId, Iterable<Long> orderIds)
            throws Exception {
        Set<Long> sortedIds = new TreeSet<Long>();
        for (Long orderId : orderIds) {
            if (orderId == null || orderId.longValue() < 1L) {
                throw badRequest("수주를 선택해 주세요.");
            }
            sortedIds.add(orderId);
        }
        Map<Long, SalesDeliverySourceOrderHeaderVO> result =
                new LinkedHashMap<Long, SalesDeliverySourceOrderHeaderVO>();
        for (Long orderId : sortedIds) {
            SalesDeliverySourceOrderHeaderVO order = dao.lockSourceOrder(orderParams(tenantId, orderId));
            if (order == null) {
                throw notFound("수주를 찾을 수 없습니다.");
            }
            if (!EDITABLE_ORDER_STATUS.equals(order.getStatus())) {
                throw conflict("수주등록 상태의 수주만 출하계획을 등록할 수 있습니다.");
            }
            result.put(orderId, order);
        }
        return result;
    }

    private Set<Long> requestOrderIds(List<SalesDeliveryPlanDetailRequestVO> details) {
        Set<Long> orderIds = new TreeSet<Long>();
        if (details != null) {
            for (SalesDeliveryPlanDetailRequestVO detail : details) {
                if (detail == null || detail.getSalesOrderId() == null) {
                    throw badRequest("수주를 선택해 주세요.");
                }
                orderIds.add(detail.getSalesOrderId());
            }
        }
        return orderIds;
    }

    private Map<Long, SalesDeliveryPlanDetailVO> indexPlanDetails(List<SalesDeliveryPlanDetailVO> rows) {
        Map<Long, SalesDeliveryPlanDetailVO> result = new LinkedHashMap<Long, SalesDeliveryPlanDetailVO>();
        if (rows != null) {
            for (SalesDeliveryPlanDetailVO row : rows) {
                if (row.getSalesDeliveryPlanDetailId() != null) {
                    result.put(row.getSalesDeliveryPlanDetailId(), row);
                }
            }
        }
        return result;
    }

    private Map<String, Object> detailParams(Long tenantId, Long orderId, Long planId,
            SalesDeliveryPlanDetailVO orderLine, SalesDeliveryPlanDetailRequestVO detail,
            int lineNo, String userId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("salesOrderId", orderId);
        params.put("salesDeliveryPlanId", planId);
        params.put("salesOrderDetailId", orderLine.getSalesOrderDetailId());
        params.put("materialId", orderLine.getMaterialId());
        params.put("lineNo", lineNo);
        params.put("planDt", detail.getPlanDt());
        params.put("plannedQty", detail.getPlannedQty().setScale(QTY_SCALE, RoundingMode.UNNECESSARY));
        params.put("createdBy", userId);
        params.put("updatedBy", userId);
        return params;
    }

    private Map<String, Object> detailParamsForExisting(Long tenantId, Long planId, Long detailId) {
        Map<String, Object> params = planParams(tenantId, planId);
        params.put("salesDeliveryPlanDetailId", detailId);
        return params;
    }

    private String generatePlanNo(Long tenantId) throws Exception {
        String dateKey = LocalDate.now().toString().replace("-", "");
        Long sequence = sequenceService.nextValue(PLAN_NO_GENERATOR_KEY, tenantId.toString(), dateKey);
        if (sequence == null || sequence.longValue() < 1L) {
            throw new IllegalStateException("출하계획번호 채번에 실패했습니다.");
        }
        String planNo = String.format(Locale.ROOT, "DP-%s-%04d", dateKey, sequence);
        if (planNo.length() > PLAN_NO_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "출하계획번호를 생성할 수 없습니다.");
        }
        return planNo;
    }

    private void validateRequest(SalesDeliveryPlanRequestVO request, boolean update) {
        if (request == null || request.getDetails() == null || request.getDetails().isEmpty()) {
            throw badRequest("출하계획 상세를 입력해 주세요.");
        }
        if (!update) {
            for (SalesDeliveryPlanDetailRequestVO detail : request.getDetails()) {
                if (detail != null && detail.getSalesDeliveryPlanDetailId() != null) {
                    throw badRequest("신규 출하계획에는 기존 상세 ID를 지정할 수 없습니다.");
                }
            }
        }
    }

    private void validateQuantity(BigDecimal quantity) {
        if (quantity == null || quantity.signum() <= 0 || quantity.scale() > QTY_SCALE
                || quantity.precision() > MAX_NUMERIC_PRECISION) {
            throw badRequest("계획수량은 소수 둘째 자리까지의 양수로 입력해 주세요.");
        }
    }

    private void requireManualMode(Long tenantId) throws Exception {
        if (!MODE_MANUAL.equals(getMode(tenantId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AUTO 테넌트에서는 출하계획을 직접 등록할 수 없습니다.");
        }
    }

    private void validatePrincipal(Long tenantId, String userId) {
        validateTenant(tenantId);
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증된 사용자 정보가 필요합니다.");
        }
    }

    private void validateTenant(Long tenantId) {
        if (tenantId == null || tenantId.longValue() < 1L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증된 테넌트 정보가 필요합니다.");
        }
    }

    private void validateId(Long id) {
        if (id == null || id.longValue() < 1L) {
            throw notFound("출하계획을 찾을 수 없습니다.");
        }
    }

    private Map<String, Object> tenantParams(Long tenantId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        return params;
    }

    private Map<String, Object> orderParams(Long tenantId, Long orderId) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("salesOrderId", orderId);
        return params;
    }

    private Map<String, Object> planParams(Long tenantId, Long planId) {
        Map<String, Object> params = tenantParams(tenantId);
        params.put("salesDeliveryPlanId", planId);
        return params;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw badRequest("계획일은 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private boolean isPositive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    private boolean same(Object left, Object right) {
        return left == null ? right == null : left.equals(right);
    }

    private boolean sameDecimal(BigDecimal left, BigDecimal right) {
        return left == null ? right == null : right != null && left.compareTo(right) == 0;
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static final class SourceKey {
        private final Long salesOrderId;
        private final Long salesOrderDetailId;

        private SourceKey(Long salesOrderId, Long salesOrderDetailId) {
            this.salesOrderId = salesOrderId;
            this.salesOrderDetailId = salesOrderDetailId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof SourceKey)) {
                return false;
            }
            SourceKey that = (SourceKey) other;
            return salesOrderId.equals(that.salesOrderId)
                    && salesOrderDetailId.equals(that.salesOrderDetailId);
        }

        @Override
        public int hashCode() {
            return 31 * salesOrderId.hashCode() + salesOrderDetailId.hashCode();
        }
    }
}
