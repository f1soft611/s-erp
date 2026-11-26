package egovframework.let.sales.shipment.statement.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.DecimalColumnContract;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.com.cmm.DecimalPolicy;
import egovframework.let.sales.shipment.statement.domain.repository.SalesStatementDAO;
import egovframework.let.system.policies.service.SystemPolicyService;

@Service
public class SalesStatementServiceImpl {
    private final SalesStatementDAO dao;
    private final IdSequenceService sequence;
    private final SystemPolicyService systemPolicyService;

    public SalesStatementServiceImpl(SalesStatementDAO dao, IdSequenceService sequence,
            SystemPolicyService systemPolicyService) {
        this.dao = dao;
        this.sequence = sequence;
        this.systemPolicyService = systemPolicyService;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> create(Long tenantId, String userId, Long salesDeliveryId,
            String statementDt, String remark) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(salesDeliveryId);
        LocalDate date = parseDate(statementDt);
        String note = validateRemark(remark);
        Map<String, Object> params = params(tenantId, userId);
        params.put("salesDeliveryId", salesDeliveryId);
        if (dao.lockDelivery(params) == null) {
            throw notFound("출하를 찾을 수 없습니다.");
        }
        List<Long> detailIds = dao.selectAvailableDetailIdsByDelivery(params);
        if (detailIds == null || detailIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "발행 가능한 출하 상세가 없습니다.");
        }
        List<Map<String, Object>> created = createGrouped(tenantId, userId, detailIds, date, note, true);
        return created.get(0);
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> create(Long tenantId, String userId, Long salesDeliveryId,
            List<Long> salesDeliveryDetailIds, String statementDt, String remark) throws Exception {
        validatePrincipal(tenantId, userId);
        LocalDate date = parseDate(statementDt);
        String note = validateRemark(remark);
        List<Long> detailIds = salesDeliveryDetailIds;
        if (detailIds == null || detailIds.isEmpty()) {
            validateId(salesDeliveryId);
            Map<String, Object> params = params(tenantId, userId);
            params.put("salesDeliveryId", salesDeliveryId);
            if (dao.lockDelivery(params) == null) {
                throw notFound("출하를 찾을 수 없습니다.");
            }
            detailIds = dao.selectAvailableDetailIdsByDelivery(params);
        }
        List<Map<String, Object>> created = createGrouped(tenantId, userId, detailIds, date, note, true);
        return created.get(0);
    }

    @Transactional(rollbackFor = Exception.class)
    public List<Map<String, Object>> createBatch(Long tenantId, String userId, List<Long> salesDeliveryDetailIds,
            String statementDt) throws Exception {
        validatePrincipal(tenantId, userId);
        LocalDate date = parseDate(statementDt);
        return createGrouped(tenantId, userId, salesDeliveryDetailIds, date, "", false);
    }

    public Map<String, Object> get(Long tenantId, String userId, Long id) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(id);
        Map<String, Object> params = params(tenantId, userId);
        params.put("salesStatementId", id);
        Map<String, Object> header = dao.selectHeader(params);
        if (header == null) throw notFound("거래명세서를 찾을 수 없습니다.");
        header.put("details", dao.selectDetails(params));
        return header;
    }

    public List<Map<String, Object>> sources(Long tenantId, String userId, String keyword) throws Exception {
        validatePrincipal(tenantId, userId);
        Map<String, Object> params = params(tenantId, userId);
        params.put("keyword", keyword == null ? "" : keyword.trim());
        List<Map<String, Object>> sources = dao.selectSources(params);
        for (Map<String, Object> source : sources) {
            Object value = source.get("salesDeliveryDetailIds");
            if (!(value instanceof String)) {
                throw new IllegalStateException("출하 상세 목록 응답을 확인해 주세요.");
            }
            List<Long> detailIds = new ArrayList<Long>();
            String[] values = ((String) value).split(",");
            try {
                for (String detailId : values) {
                    detailIds.add(Long.valueOf(detailId));
                }
            } catch (NumberFormatException ex) {
                throw new IllegalStateException("출하 상세 목록 응답을 확인해 주세요.", ex);
            }
            source.put("salesDeliveryDetailIds", detailIds);
        }
        return sources;
    }

    public List<Map<String, Object>> status(Long tenantId, String userId, String from, String to, String keyword)
            throws Exception {
        validatePrincipal(tenantId, userId);
        LocalDate start = parseDate(from);
        LocalDate end = parseDate(to);
        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "명세일 기간을 확인해 주세요.");
        }
        Map<String, Object> params = params(tenantId, userId);
        params.put("from", start);
        params.put("to", end);
        params.put("keyword", keyword == null ? "" : keyword.trim());
        return dao.selectStatus(params);
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> update(Long tenantId, String userId, Long id, String statementDt, String remark)
            throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(id);
        Map<String, Object> params = params(tenantId, userId);
        params.put("salesStatementId", id);
        params.put("statementDt", parseDate(statementDt));
        params.put("remark", validateRemark(remark));
        if (dao.updateHeader(params) != 1) throw notFound("거래명세서를 찾을 수 없습니다.");
        return get(tenantId, userId, id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long tenantId, String userId, Long id) throws Exception {
        validatePrincipal(tenantId, userId);
        validateId(id);
        Map<String, Object> params = params(tenantId, userId);
        params.put("salesStatementId", id);
        if (dao.deleteHeader(params) != 1) throw notFound("거래명세서를 찾을 수 없습니다.");
        dao.clearSourceDetailLinks(params);
    }

    private Map<String, Object> params(Long tenantId, String userId) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("tenantId", tenantId);
        result.put("userId", userId);
        return result;
    }

    private List<Map<String, Object>> createGrouped(Long tenantId, String userId,
            List<Long> salesDeliveryDetailIds, LocalDate date, String remark, boolean singleCustomer)
            throws Exception {
        if (salesDeliveryDetailIds == null || salesDeliveryDetailIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발행할 출하 상세를 확인해 주세요.");
        }
        if (salesDeliveryDetailIds.size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "거래명세서는 출하 상세를 최대 100건까지 발행할 수 있습니다. 자동 발행 시 출하도 저장되지 않습니다.");
        }
        Set<Long> uniqueIds = new TreeSet<Long>();
        for (Long detailId : salesDeliveryDetailIds) {
            validateId(detailId);
            uniqueIds.add(detailId);
        }

        Map<String, Object> lockParams = params(tenantId, userId);
        lockParams.put("salesDeliveryDetailIds", new ArrayList<Long>(uniqueIds));
        List<Map<String, Object>> targets = dao.lockDeliveryDetails(lockParams);
        if (targets == null || targets.size() != uniqueIds.size()) {
            throw notFound("출하 상세를 찾을 수 없습니다.");
        }

        Map<Long, List<Map<String, Object>>> groups =
                new LinkedHashMap<Long, List<Map<String, Object>>>();
        for (Map<String, Object> target : targets) {
            if (target.get("revenueClosedAt") != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "마감된 출하 상세는 발행할 수 없습니다.");
            }
            if (Boolean.TRUE.equals(target.get("hasActiveStatement"))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 발행된 출하 상세가 포함되어 있습니다.");
            }
            Long customerId = numberValue(target.get("customerId"));
            numberValue(target.get("salesDeliveryId"));
            List<Map<String, Object>> group = groups.get(customerId);
            if (group == null) {
                group = new ArrayList<Map<String, Object>>();
                groups.put(customerId, group);
            }
            group.add(target);
        }
        if (singleCustomer && groups.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "거래처가 같은 출하 상세만 선택할 수 있습니다.");
        }

        DecimalPolicy decimalPolicy = DecimalPolicy.forModule("SALES", systemPolicyService.getGridDecimals(tenantId),
                DecimalColumnContract.forDocument("sales.delivery"));
        List<Map<String, Object>> created = new ArrayList<Map<String, Object>>();
        String scope = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        for (Map.Entry<Long, List<Map<String, Object>>> entry : groups.entrySet()) {
            List<Map<String, Object>> group = entry.getValue();
            List<Long> groupIds = new ArrayList<Long>();
            BigDecimal total = BigDecimal.ZERO;
            for (Map<String, Object> target : group) {
                groupIds.add(numberValue(target.get("salesDeliveryDetailId")));
                total = total.add(amountValue(target.get("totalAmt")));
            }
            Long number = sequence.nextValue("SALES_STATEMENT_NO", String.valueOf(tenantId), scope);
            if (number == null || number < 1) {
                throw new IllegalStateException("거래명세서 번호 생성에 실패했습니다.");
            }
            Map<String, Object> params = params(tenantId, userId);
            params.put("salesDeliveryId", numberValue(group.get(0).get("salesDeliveryId")));
            params.put("customerId", entry.getKey());
            params.put("salesDeliveryDetailIds", groupIds);
            params.put("statementNo", String.format(Locale.ROOT, "TS-%s-%04d", scope, number));
            params.put("statementDt", date);
            params.put("remark", remark);
            params.put("totalAmt", decimalPolicy.amount("deliveryTotal", total, "명세서 합계"));
            Long id = dao.insertHeader(params);
            if (id == null || id < 1) {
                throw new IllegalStateException("거래명세서 저장에 실패했습니다.");
            }
            params.put("salesStatementId", id);
            if (dao.insertDetails(params) != groupIds.size()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "선택한 출하 상세를 저장하지 못했습니다.");
            }
            created.add(get(tenantId, userId, id));
        }
        return created;
    }

    private BigDecimal amountValue(Object value) {
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        throw new IllegalStateException("출하 상세 금액을 확인해 주세요.");
    }

    private Long numberValue(Object value) {
        if (!(value instanceof Number)) {
            throw new IllegalStateException("출하 상세 응답을 확인해 주세요.");
        }
        return Long.valueOf(((Number) value).longValue());
    }

    private void validatePrincipal(Long tenantId, String userId) {
        if (tenantId == null || tenantId < 1 || !StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void validateId(Long id) {
        if (id == null || id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "식별자를 확인해 주세요.");
    }

    private LocalDate parseDate(String value) {
        try {
            if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) throw new DateTimeParseException("date", "", 0);
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "명세일을 확인해 주세요.");
        }
    }

    private String validateRemark(String remark) {
        String value = remark == null ? "" : remark.trim();
        if (value.length() > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비고가 너무 깁니다.");
        return value;
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
