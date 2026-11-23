package egovframework.let.sales.revenue.closing.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseRequestVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingCloseResponseVO;
import egovframework.let.sales.revenue.closing.domain.model.RevenueClosingSearchVO;
import egovframework.let.sales.revenue.closing.domain.repository.RevenueClosingDAO;
import egovframework.let.sales.revenue.closing.service.RevenueClosingService;
import egovframework.let.sales.shipment.statement.service.impl.SalesStatementServiceImpl;

@Service("revenueClosingService")
public class RevenueClosingServiceImpl implements RevenueClosingService {
    private static final int MAX_BATCH_SIZE = 100;
    private final RevenueClosingDAO dao;
    private final SalesStatementServiceImpl statements;

    public RevenueClosingServiceImpl(RevenueClosingDAO dao, SalesStatementServiceImpl statements) {
        this.dao = dao;
        this.statements = statements;
    }

    @Override
    public RevenueClosingResponseVO search(Long tenantId, String userId, RevenueClosingSearchVO search)
            throws Exception {
        validatePrincipal(tenantId, userId);
        if (search == null) {
            throw badRequest("검색 조건을 확인해 주세요.");
        }

        LocalDate from = parseDate(search.getDeliveryDtFrom());
        LocalDate to = parseDate(search.getDeliveryDtTo());
        if (from.isAfter(to)) {
            throw badRequest("출하일 기간을 확인해 주세요.");
        }

        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("deliveryDtFrom", from);
        params.put("deliveryDtTo", to);
        params.put("keyword", search.getKeyword() == null ? "" : search.getKeyword().trim());
        params.put("customerIds", normalizeCustomerIds(search.getCustomerIds()));

        RevenueClosingResponseVO result = new RevenueClosingResponseVO();
        result.setDetails(dao.selectDetails(params));
        result.setCustomerSummaries(dao.selectCustomerSummaries(params));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RevenueClosingCloseResponseVO close(Long tenantId, String userId, RevenueClosingCloseRequestVO request)
            throws Exception {
        validatePrincipal(tenantId, userId);
        if (request == null || request.getSalesDeliveryDetailIds() == null
                || request.getSalesDeliveryDetailIds().isEmpty()) {
            throw badRequest("마감할 상세를 확인해 주세요.");
        }
        if (request.getSalesDeliveryDetailIds().size() > MAX_BATCH_SIZE) {
            throw badRequest("매출마감은 출하 상세를 최대 100건까지 처리할 수 있습니다.");
        }
        LocalDate statementDate = parseDate(request.getStatementDt());
        Set<Long> uniqueIds = new TreeSet<Long>();
        for (Long detailId : request.getSalesDeliveryDetailIds()) {
            if (detailId == null || detailId.longValue() < 1L) {
                throw badRequest("마감할 상세를 확인해 주세요.");
            }
            uniqueIds.add(detailId);
        }
        List<Long> detailIds = new ArrayList<Long>(uniqueIds);
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        params.put("salesDeliveryDetailIds", detailIds);
        List<Map<String, Object>> targets = dao.lockDetailsForClosing(params);
        if (targets == null || targets.size() != detailIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "마감 대상을 찾을 수 없습니다.");
        }

        List<Long> unissuedDetailIds = new ArrayList<Long>();
        for (Map<String, Object> target : targets) {
            if (target.get("revenueClosedAt") != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 마감된 상세가 포함되어 있습니다.");
            }
            if (!Boolean.TRUE.equals(target.get("hasActiveStatement"))) {
                Object detailId = target.get("salesDeliveryDetailId");
                if (!(detailId instanceof Number)) {
                    throw new IllegalStateException("마감 상세 응답을 확인해 주세요.");
                }
                unissuedDetailIds.add(Long.valueOf(((Number) detailId).longValue()));
            }
        }

        List<Map<String, Object>> items = unissuedDetailIds.isEmpty()
                ? new ArrayList<Map<String, Object>>()
                : statements.createBatch(tenantId, userId, unissuedDetailIds, statementDate.toString());
        if (dao.markDetailsClosed(params) != detailIds.size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "매출마감 상태가 변경되었습니다. 다시 조회해 주세요.");
        }
        RevenueClosingCloseResponseVO response = new RevenueClosingCloseResponseVO();
        response.setClosedCount(detailIds.size());
        response.setItems(items);
        return response;
    }

    private List<Long> normalizeCustomerIds(List<Long> customerIds) {
        if (customerIds == null || customerIds.isEmpty()) {
            return new ArrayList<Long>();
        }
        Set<Long> uniqueIds = new LinkedHashSet<Long>();
        for (Long customerId : customerIds) {
            if (customerId == null || customerId.longValue() < 1L) {
                throw badRequest("거래처 검색 조건을 확인해 주세요.");
            }
            uniqueIds.add(customerId);
        }
        return new ArrayList<Long>(uniqueIds);
    }

    private LocalDate parseDate(String value) {
        try {
            if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
                throw new DateTimeParseException("date", "", 0);
            }
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw badRequest("출하일을 확인해 주세요.");
        }
    }

    private void validatePrincipal(Long tenantId, String userId) {
        if (tenantId == null || tenantId.longValue() < 1L || !StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
