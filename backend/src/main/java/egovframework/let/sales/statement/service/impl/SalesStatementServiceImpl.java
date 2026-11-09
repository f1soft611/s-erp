package egovframework.let.sales.statement.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.sales.statement.domain.repository.SalesStatementDAO;

@Service
public class SalesStatementServiceImpl {
    private final SalesStatementDAO dao;
    private final IdSequenceService sequence;

    public SalesStatementServiceImpl(SalesStatementDAO dao, IdSequenceService sequence) {
        this.dao = dao;
        this.sequence = sequence;
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
        if (dao.existsActive(params)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 거래명세서가 등록된 출하입니다.");
        }
        String scope = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        Long number = sequence.nextValue("SALES_STATEMENT_NO", String.valueOf(tenantId), scope);
        if (number == null || number < 1) {
            throw new IllegalStateException("거래명세서 번호 생성에 실패했습니다.");
        }
        params.put("statementNo", String.format(Locale.ROOT, "TS-%s-%04d", scope, number));
        params.put("statementDt", date);
        params.put("remark", note);
        Long id = dao.insertHeader(params);
        if (id == null || id < 1) {
            throw new IllegalStateException("거래명세서 저장에 실패했습니다.");
        }
        params.put("salesStatementId", id);
        if (dao.insertDetails(params) < 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "출하 상세가 없습니다.");
        }
        return get(tenantId, userId, id);
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
        return dao.selectSources(params);
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
    }

    private Map<String, Object> params(Long tenantId, String userId) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("tenantId", tenantId);
        result.put("userId", userId);
        return result;
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
